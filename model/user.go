package model;

import (
   "encoding/json"
   "fmt"

   driverutil "github.com/eriq-augustine/elfs/util"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/util"
)

// The information that is written to disk for a user.
type DiskUser struct {
   Username string
   Passhash string
   IsAdmin bool
   IV []byte
   CipherPartitionCredentials []byte  // Encrypted with weak passhash.
}

// The information about users that is kept in memory.
// Then a user auths, we can decrypt their parition credentials.
type MemoryUser struct {
   DiskUser
   PartitionCredentials []partitionCredential
}

// Information for a user specific to a partition.
// Will remain encrypted on disk.
type partitionCredential struct {
   PartitionAddress string
   Username string
   Password string
   PartitionKey string
}

// The partition credentials are stored on disk as an encrypted JSON string.
// The key is the user's weakhash, which is not stored anywhere.
func (this *MemoryUser) EncryptPartitionCredentials(weakhash string) error {
   jsonString, err := util.ToJSON(this.PartitionCredentials);
   if (err != nil) {
      return errors.WithStack(err);
   }

   ciphertext, err := driverutil.Encrypt([]byte(weakhash), this.IV, []byte(jsonString));
   if (err != nil) {
      return errors.WithStack(err);
   }

   this.CipherPartitionCredentials = ciphertext;
   return nil;
}

func (this *MemoryUser) DecryptPartitionCredentials(weakhash string) error {
   if (this.PartitionCredentials != nil) {
      return nil;
   }

   cleartext, err := driverutil.Decrypt([]byte(weakhash), this.IV, this.CipherPartitionCredentials);
   if (err != nil) {
      return errors.WithStack(err);
   }

   err = json.Unmarshal(cleartext, &this.PartitionCredentials);
   return errors.WithStack(err);
}

func (this *MemoryUser) String() string {
   if (this.IsAdmin) {
      return fmt.Sprintf("%s (Admin)", this.Username);
   }

   return this.Username;
}
