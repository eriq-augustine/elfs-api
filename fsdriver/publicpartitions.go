package fsdriver;

// Manage "public partitions".
// Public partitions are kept on disk in an encrypted file.
// The key for this file is not also kept on disk, but must be entered in by an admin.

import (
   "encoding/hex"
   "encoding/json"
   "io/ioutil"
   "sync"

   driverutil "github.com/eriq-augustine/elfs/util"
   "github.com/eriq-augustine/goconfig"
   "github.com/pkg/errors"
)

// {connectionString: credentials}
var publicPartitions map[string]PartitionCredentials;

var publicPartitionsMutex *sync.Mutex;

type PartitionCredentials struct {
   Key []byte
   IV []byte
}

func init() {
   publicPartitions = make(map[string]PartitionCredentials);
   publicPartitionsMutex = &sync.Mutex{};
}

// Returns: Key, IV, ok.
func GetPublicCredentials(connectionString string) ([]byte, []byte, bool) {
   creds, ok := publicPartitions[connectionString];
   return creds.Key, creds.IV, ok;
}

// Key and IV are hex encoded strings.
func LoadPublicPartitions(hexKey string, hexIV string) error {
   if (len(publicPartitions) > 0) {
      return nil;
   }

   publicPartitionsMutex.Lock();
   defer publicPartitionsMutex.Unlock();

   partitions, err := LoadPublicPartitionsFile(goconfig.GetString("publicPartitionsFile"), hexKey, hexIV);
   if (err != nil) {
      return errors.WithStack(err);
   }

   publicPartitions = partitions;
   return nil;
}

func LoadPublicPartitionsFile(path string, hexKey string, hexIV string) (map[string]PartitionCredentials, error) {
   var partitions map[string]PartitionCredentials = make(map[string]PartitionCredentials);

   key, err := hex.DecodeString(hexKey);
   if (err != nil) {
      return nil, errors.WithStack(err);
   }

   iv, err := hex.DecodeString(hexIV);
   if (err != nil) {
      return nil, errors.WithStack(err);
   }

   ciphertext, err := ioutil.ReadFile(path);
   if (err != nil) {
      return nil, errors.WithStack(err);
   }

   cleartext, err := driverutil.Decrypt(key, iv, ciphertext);
   if (err != nil) {
      return nil, errors.WithStack(err);
   }

   err = json.Unmarshal(cleartext, &partitions);
   if (err != nil) {
      return nil, errors.WithStack(err);
   }

   return partitions, nil;
}

// Key and IV are hex encoded strings.
func SavePublicPartitions(hexKey string, hexIV string) error {
   publicPartitionsMutex.Lock();
   defer publicPartitionsMutex.Unlock();

   return SavePublicPartitionsFile(publicPartitions, goconfig.GetString("publicPartitionsFile"), hexKey, hexIV);
}

func SavePublicPartitionsFile(partitions map[string]PartitionCredentials, path string, hexKey string, hexIV string) error {
   key, err := hex.DecodeString(hexKey);
   if (err != nil) {
      return errors.WithStack(err);
   }

   iv, err := hex.DecodeString(hexIV);
   if (err != nil) {
      return errors.WithStack(err);
   }

   cleartext, err := json.Marshal(partitions);
   if (err != nil) {
      return errors.WithStack(err);
   }

   ciphertext, err := driverutil.Encrypt(key, iv, cleartext);
   if (err != nil) {
      return errors.WithStack(err);
   }

   err = ioutil.WriteFile(path, ciphertext, 0600);
   if (err != nil) {
      return errors.WithStack(err);
   }

   return nil;
}
