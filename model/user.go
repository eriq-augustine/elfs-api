package model;

import (
   "encoding/hex"
   "encoding/json"
   "fmt"
   "strings"

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
   PartitionCredentials map[string]PartitionCredential  // Map of connection string to credential.
   partitionAliases map[string]string  // Maps an alias to the real connectio string.
}

// Information for a user specific to a partition.
// Will remain encrypted on disk.
type PartitionCredential struct {
   Username string
   Weakhash string
   PartitionAlias string
   PartitionKey []byte
   PartitionIV []byte
}

// The partition credentials are stored on disk as an encrypted JSON string.
// The key is the user's weakhash, which is not stored anywhere.
func (this *MemoryUser) EncryptPartitionCredentials(weakhash string) error {
   if (this.PartitionCredentials == nil || len(this.PartitionCredentials) == 0) {
      this.CipherPartitionCredentials = nil;
      return nil;
   }

   jsonString, err := util.ToJSON(this.PartitionCredentials);
   if (err != nil) {
      return errors.WithStack(err);
   }

   // Convert the weak hash from hex to bytes.
   // The weakhash is supposed to be in a SHA256 (so 32 bytes).
   if (len(weakhash) != 64) {
      return errors.Errorf("Weakhash is incorrect length. Expected: 64, Got: %d", len(weakhash));
   }

   var keyBytes []byte = make([]byte, hex.DecodedLen(len(weakhash)));
   _, err = hex.Decode(keyBytes, []byte(weakhash));
   if (err != nil) {
      return errors.WithStack(err);
   }

   ciphertext, err := driverutil.Encrypt(keyBytes, this.IV, []byte(jsonString));
   if (err != nil) {
      return errors.WithStack(err);
   }

   this.CipherPartitionCredentials = ciphertext;
   return nil;
}

func (this *MemoryUser) DecryptPartitionCredentials(weakhash string) error {
   if (this.CipherPartitionCredentials == nil || len(this.CipherPartitionCredentials) == 0) {
      this.PartitionCredentials = make(map[string]PartitionCredential);
      return nil;
   }

   if (this.PartitionCredentials != nil) {
      return nil;
   }

   // Convert the weak hash from hex to bytes.
   // The weakhash is supposed to be in a SHA256 (so 32 bytes).
   if (len(weakhash) != 64) {
      return errors.Errorf("Weakhash is incorrect length. Expected: 64, Got: %d", len(weakhash));
   }

   var keyBytes []byte = make([]byte, hex.DecodedLen(len(weakhash)));
   _, err := hex.Decode(keyBytes, []byte(weakhash));
   if (err != nil) {
      return errors.WithStack(err);
   }

   cleartext, err := driverutil.Decrypt(keyBytes, this.IV, this.CipherPartitionCredentials);
   if (err != nil) {
      return errors.WithStack(err);
   }

   err = json.Unmarshal(cleartext, &this.PartitionCredentials);
   if (err != nil) {
      return errors.WithStack(err);
   }

   // Now include any aliases.
   this.partitionAliases = make(map[string]string);
   for connectionString, credentials := range(this.PartitionCredentials) {
      if (credentials.PartitionAlias != "") {
         this.partitionAliases[credentials.PartitionAlias] = connectionString;
      }
   }

   return nil;
}

func (this *MemoryUser) LongString() string {
   var filesystemUsers []string = make([]string, 0, len(this.PartitionCredentials));
   for connectionString, creds := range(this.PartitionCredentials) {
      var alias string = "";
      if (creds.PartitionAlias != "") {
         alias = "(" + creds.PartitionAlias + ")";
      }

      filesystemUsers = append(filesystemUsers, fmt.Sprintf("%s::%s%s", creds.Username, connectionString, alias));
   }

   var adminStatus string = "";
   if (this.IsAdmin) {
      adminStatus = "(Admin) ";
   }

   return fmt.Sprintf("%s %s[%s]", this.Username, adminStatus, strings.Join(filesystemUsers, ", "));
}

func (this *MemoryUser) String() string {
   var adminStatus string = "";
   if (this.IsAdmin) {
      adminStatus = "(Admin) ";
   }

   return fmt.Sprintf("%s %s", this.Username, adminStatus);
}

// Get partition credentials while observing aliases.
// The second return value will be the resolved connection string
// (ie, if it is an alias it will be converted to a true connection string).
func (this *MemoryUser) GetPartitionCredential(connectionString string) (PartitionCredential, string, bool) {
   newConnectionString, ok := this.partitionAliases[connectionString];
   if (ok) {
      connectionString = newConnectionString;
   }

   creds, ok := this.PartitionCredentials[connectionString];
   return creds, connectionString, ok;
}
