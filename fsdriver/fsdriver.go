package fsdriver;

// Manage filesystem drivers.

import (
   "encoding/hex"
   "path/filepath"
   "strings"
   "sync"

   "github.com/eriq-augustine/elfs/driver"
   "github.com/pkg/errors"
)

// TODO(eriq): "Public" partitions

const (
   CONNECTION_STRING_DELIM = ":"

   TEST_KEY = "b883738825a10c308c766db293622c4d67936f570212b9c7d0fa7f4b27ef7f5b"
   TEST_IV = "c623e32e564f9f4746a98db7"
)

var drivers map[string]*driver.Driver;

var driverMutex *sync.Mutex;

func init() {
   driverMutex = &sync.Mutex{};
   drivers = make(map[string]*driver.Driver);
}

func GetDriver(connectionString string) (*driver.Driver, error) {
   driverMutex.Lock();
   defer driverMutex.Unlock();

   connectionString = strings.TrimSpace(connectionString);
   var rtn *driver.Driver = nil;
   var err error = nil;

   rtn, ok := drivers[connectionString];
   if (ok) {
      return rtn, nil;
   }

   key, err := hex.DecodeString(TEST_KEY);
   if (err != nil) {
      return nil, errors.WithStack(err);
   }

   iv, err := hex.DecodeString(TEST_IV);
   if (err != nil) {
      return nil, errors.WithStack(err);
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
