package fsdriver;

// Manage filesystem drivers.

import (
   "path/filepath"
   "strings"
   "sync"

   "github.com/eriq-augustine/elfs/driver"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/model"
)

const (
   CONNECTION_STRING_DELIM = ":"
)

// {connectionString: driver}.
var drivers map[string]*driver.Driver;

var driverMutex *sync.Mutex;

func init() {
   driverMutex = &sync.Mutex{};
   drivers = make(map[string]*driver.Driver);
}

func GetDriver(user *model.MemoryUser, connectionString string) (*driver.Driver, error) {
   driverMutex.Lock();
   defer driverMutex.Unlock();

   connectionString = strings.TrimSpace(connectionString);
   var rtn *driver.Driver = nil;
   var err error = nil;

   // Before we even check to see if the driver has already been initialized,
   // we need to ensure that this user has proper permissions for this partition
   // (not even on the filesystem level, but on the API level).
   // We will do this be ensuring that the user has access to this partition's key.
   key, iv, err := getCredentials(user, connectionString);
   if (err != nil) {
      return nil, errors.WithStack(err);
   }

   // Now that permissions have been ensured, check if the driver has already been initialized.
   rtn, ok := drivers[connectionString];
   if (ok) {
      return rtn, nil;
   }

   var parts []string = strings.SplitN(connectionString, CONNECTION_STRING_DELIM, 2);
   if (len(parts) != 2) {
      return nil, errors.Errorf("Bad connection string: [%s]", connectionString);
   }

   if (parts[0] == driver.DRIVER_TYPE_LOCAL) {
      if (!filepath.IsAbs(parts[1])) {
         return nil, errors.New("Local connection string path must be absolute.");
      }

      rtn, err = driver.NewLocalDriver(key, iv, parts[1]);
      if (err != nil) {
         return nil, errors.WithStack(err);
      }
   } else if (parts[0] == driver.DRIVER_TYPE_S3) {
      return nil, errors.New("S3 driver not yet supported.");
   } else {
      return nil, errors.Errorf("Unknown driver type: [%s]", parts[0]);
   }

   drivers[connectionString] = rtn;
   return rtn, nil;
}

func CloseDrivers() {
   driverMutex.Lock();
   defer driverMutex.Unlock();

   for _, driver := range(drivers) {
      driver.Close()
   }

   drivers = make(map[string]*driver.Driver);
}

// Returns: Key, IV, error.
func getCredentials(user *model.MemoryUser, connectionString string) ([]byte, []byte, error) {
   // First check if the user has private credentials for this partition.
   credentials, ok := user.PartitionCredentials[connectionString];
   if (ok && credentials.PartitionKey != nil) {
      return credentials.PartitionKey, credentials.PartitionIV, nil;
   }

   // Now check to see if this is a public partition.
   key, iv, ok := GetPublicCredentials(connectionString);
   if (ok) {
      return key, iv, nil;
   }

   return nil, nil, errors.Errorf("Could not location credentials for [%s]. Maybe public parititions have not been loaded.", connectionString);
}
