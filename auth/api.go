package auth;

// Authentication for the API.
// Auth the user and give them a token that does not expire.
// However the token is stored in memory, so a server restart invalidates it.

import (
   "bytes"
   "crypto/rand"
   "encoding/base64"
   "encoding/binary"
   "time"

   "github.com/eriq-augustine/elfs/user"

   "github.com/eriq-augustine/elfs-api/apierrors"
   "github.com/eriq-augustine/elfs-api/fsdriver"
)

const (
   TOKEN_RANDOM_BYTE_LEN = 16
)

// {username: *User}
var apiUsers map[string]*user.User
// {token: username}
var apiSessions map[string]string;

func init() {
   apiUsers = make(map[string]*user.User);
   apiSessions = make(map[string]string);
}

func GetUser(username string) (*user.User, bool) {
   user, ok := apiUsers[username];
   return user, ok;
}

// Returns the token.
func AuthenticateUser(username string, weakhash string) (string, error) {
   authUser, err := fsdriver.GetDriver().UserAuth(username, weakhash);
   if (err != nil) {
      return "", apierrors.TokenValidationError{apierrors.TOKEN_AUTH_BAD_CREDENTIALS};
   }

   token, _:= generateToken();

   apiUsers[username] = authUser;
   apiSessions[token] = username;

   return token, nil;
}

// Validate the token and get back the username associated with it.
func ValidateToken(token string) (string, error) {
   username, exists := apiSessions[token];
   if (!exists) {
      return "", apierrors.TokenValidationError{apierrors.TOKEN_VALIDATION_NO_TOKEN};
   }

   return username, nil;
}

// Invalidate the token.
func InvalidateToken(token string) (bool, error) {
   _, exists := apiSessions[token];
   if (!exists) {
      return false, apierrors.TokenValidationError{apierrors.TOKEN_VALIDATION_NO_TOKEN};
   }

   delete(apiSessions, token);
   return true, nil;
}

// Generate a "unique" token.
// Return the base64 encoding of the token as well as the time it was created.
// The token is a base64 encoding of <date (micro unix epoch), user id, rand>.
// The date takes 8 bytes (uint64) and the random section is TOKEN_RANDOM_BYTE_LEN bytes.
func generateToken() (string, time.Time) {
   now := time.Now();

   randData := make([]byte, TOKEN_RANDOM_BYTE_LEN);
   rand.Read(randData);

   timeBinary := make([]byte, 8);
   binary.LittleEndian.PutUint64(timeBinary, uint64(now.UnixNano() / 1000));

   tokenData := bytes.Join([][]byte{timeBinary, randData}, []byte{});

   return base64.URLEncoding.EncodeToString(tokenData), now;
}
