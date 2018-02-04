package fsdriver;

// Manage the underlying filesystem driver.

import (
   "path/filepath"
   "strings"
   "sync"

   "github.com/eriq-augustine/elfs/connector"
   "github.com/eriq-augustine/elfs/driver"
   "github.com/eriq-augustine/goconfig"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/config"
)

const (
   CONNECTION_STRING_DELIM = ":"
)

var activeDriver *driver.Driver;
var driverMutex *sync.Mutex;

func init() {
   driverMutex = &sync.Mutex{};
   activeDriver = nil;
}

// Connect to the filesystem and load a driver for it.
func LoadDriver(connectionString string, key []byte, iv []byte) error {
   if (activeDriver != nil) {
      return nil;
   }

   driver, err := getDriverInternal(connectionString, key, iv);
   if (err != nil) {
      return errors.WithStack(err);
   }

   activeDriver = driver

   return nil;
}

// Get the driver for this server.
func GetDriver() *driver.Driver {
   return activeDriver;
}

func getDriverInternal(connectionString string, key []byte, iv []byte) (*driver.Driver, error) {
   driverMutex.Lock();
   defer driverMutex.Unlock();

   var rtn *driver.Driver = nil;
   var err error = nil;

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
      var awsCredentialsPath string = goconfig.GetStringDefault(config.KEY_AWS_CRED_PATH, config.DEFAULT_AWS_CRED_PATH);
      var awsProfile string = goconfig.GetStringDefault(config.KEY_AWS_PROFILE, config.DEFAULT_AWS_PROFILE);
      var awsRegion string = goconfig.GetStringDefault(config.KEY_AWS_REGION, config.DEFAULT_AWS_REGION);

      rtn, err = driver.NewS3Driver(key, iv, parts[1], awsCredentialsPath, awsProfile, awsRegion);
      if (err != nil) {
         return nil, errors.WithStack(err);
      }
   } else {
      return nil, errors.Errorf("Unknown driver type: [%s]", parts[0]);
   }

   return rtn, nil;
}

func CloseDriver() {
   driverMutex.Lock();
   defer driverMutex.Unlock();

   if (activeDriver == nil) {
      return;
   }

   activeDriver.Close()
}
