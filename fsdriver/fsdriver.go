package fsdriver;

// Manage filesystem drivers.

import (
   "path/filepath"
   "strings"
   "sync"

   "github.com/eriq-augustine/elfs/connector"
   "github.com/eriq-augustine/elfs/driver"
   "github.com/eriq-augustine/elfs/user"
   "github.com/eriq-augustine/goconfig"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/model"
)

const (
   CONNECTION_STRING_DELIM = ":"

   AWS_CRED_KEY = "awsCredentialsPath"
   AWS_CRED_DEFAULT = "~/.aws/credentials"
   AWS_PROFILE_KEY = "awsProfile"
   AWS_PROFILE_DEFAULT = "default"
   AWS_REGION_KEY = "awsRegion"
   AWS_REGION_DEFAULT = "us-west-1"
)

// {connectionString: driver}.
var drivers map[string]*driver.Driver;

var driverMutex *sync.Mutex;

func init() {
   driverMutex = &sync.Mutex{};
   drivers = make(map[string]*driver.Driver);
}

// Get the driver for the given connection string (initialize if necessary).
// Also, authenticate the user for the given partition before we hand over a driver.
func GetDriver(apiUser *model.MemoryUser, connectionString string) (*driver.Driver, user.Id, error) {
   connectionString = strings.TrimSpace(connectionString);

   // Before we even check to see if the driver has already been initialized,
   // we need to ensure that this user has proper permissions for this partition
   // (not even on the filesystem level, but on the API level).
   // We will do this be ensuring that the user has access to this partition's key.
   key, iv, connectionString, err := getCredentials(apiUser, connectionString);
   if (err != nil) {
      return nil, user.EMPTY_ID, errors.WithStack(err);
   }

   // Now get the actual driver.
   driver, err := getDriverInternal(connectionString, key, iv);
   if (err != nil) {
      return nil, user.EMPTY_ID, errors.WithStack(err);
   }

   // Now, make sure the user can authenticate into this fs before we give them a driver.
   userId, err := auth.AuthenticateFilesystemUser(driver, apiUser.Username);
   if (err != nil) {
      return nil, user.EMPTY_ID, errors.WithStack(err);
   }

   return driver, userId, nil;
}

func getDriverInternal(connectionString string, key []byte, iv []byte) (*driver.Driver, error) {
   driverMutex.Lock();
   defer driverMutex.Unlock();

   var rtn *driver.Driver = nil;
   var err error = nil;

   // Now that permissions have been ensured, check if the driver has already been initialized.
   rtn, ok := drivers[connectionString];
   if (ok) {
      return rtn, nil;
   }

   var parts []string = strings.SplitN(connectionString, CONNECTION_STRING_DELIM, 2);
   if (len(parts) != 2) {
      return nil, errors.Errorf("Bad connection string: [%s]", connectionString);
   }

   if (parts[0] == connector.CONNECTOR_TYPE_LOCAL) {
      if (!filepath.IsAbs(parts[1])) {
         return nil, errors.New("Local connection string path must be absolute.");
      }

      rtn, err = driver.NewLocalDriver(key, iv, parts[1]);
      if (err != nil) {
         return nil, errors.WithStack(err);
      }
   } else if (parts[0] == connector.CONNECTOR_TYPE_S3) {
      var awsCredentialsPath string = goconfig.GetStringDefault(AWS_CRED_KEY, AWS_CRED_DEFAULT);
      var awsProfile string = goconfig.GetStringDefault(AWS_PROFILE_KEY, AWS_PROFILE_DEFAULT);
      var awsRegion string = goconfig.GetStringDefault(AWS_REGION_KEY, AWS_REGION_DEFAULT);

      rtn, err = driver.NewS3Driver(key, iv, parts[1], awsCredentialsPath, awsProfile, awsRegion);
      if (err != nil) {
         return nil, errors.WithStack(err);
      }
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

// Returns: Key, IV, resolved connection string, error.
func getCredentials(apiUser *model.MemoryUser, connectionString string) ([]byte, []byte, string, error) {
   // First check if the user has private credentials for this partition.
   credentials, newConnectionString, ok := apiUser.GetPartitionCredential(connectionString);
   if (ok && credentials.PartitionKey != nil) {
      return credentials.PartitionKey, credentials.PartitionIV, newConnectionString, nil;
   }

   // Now check to see if this is a public partition.
   key, iv, newConnectionString, ok := GetPublicCredentials(connectionString);
   if (ok) {
      return key, iv, newConnectionString, nil;
   }

   return nil, nil, "", errors.Errorf("Could not location credentials for [%s]. Maybe public parititions have not been loaded.", connectionString);
}

// Get connection strings for all the partitions this user has access to.
func GetAvailablePartitions(apiUser *model.MemoryUser) []string {
   // We will need to dedup the partitions since it is possible for a user to have
   // credentials for a public partition.
   var partitions map[string]bool = make(map[string]bool);

   // First add the public partitions.
   for connectionString, _ := range(publicPartitions) {
      partitions[connectionString] = true;
   }

   // Now get the private partitions.
   for connectionString, _ := range(apiUser.PartitionCredentials) {
      partitions[connectionString] = true;
   }

   var rtn []string = make([]string, 0, len(partitions));
   for connectionString, _ := range(partitions) {
      rtn = append(rtn, connectionString);
   }

   return rtn;
}
