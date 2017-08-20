package util;

import (
   "crypto/sha1"
   "crypto/sha256"
   "encoding/hex"
);

// Get the hex SHA1 string.
func SHA1Hex(val string) string {
   hash := sha1.New();
   hash.Write([]byte(val));
   return hex.EncodeToString(hash.Sum(nil));
}

// Get the SHA2-256 string.
func SHA256Hex(val string) string {
   data := sha256.Sum256([]byte(val));
   return hex.EncodeToString(data[:]);
}

// Generate a password hash the same way that clients are expected to.
func Weakhash(username string, password string) string {
   saltedData := username + "." + password + "." + username;
   return SHA256Hex(saltedData);
}
