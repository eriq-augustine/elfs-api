package auth;

// Authentication for the API.
// Note that there is a second level for authentication to each partition.
// Auth the user and give them a token that does not expire.
// However the token is stored in memory, so a server restart invalidates it.

import (
   "bytes"
   "crypto/rand"
   "encoding/base64"
   "encoding/binary"
   "encoding/json"
   "io/ioutil"
   "sync"
   "time"

   "github.com/eriq-augustine/goconfig"
   "github.com/eriq-augustine/golog"
   "golang.org/x/crypto/bcrypt"

   "github.com/eriq-augustine/elfs-api/apierrors"
   "github.com/eriq-augustine/elfs-api/model"
   "github.com/eriq-augustine/elfs-api/util"
)

const (
   TOKEN_RANDOM_BYTE_LEN = 16
)

// {username: *User}
var apiUsers map[string]*model.MemoryUser
// {token: username}
var apiSessions map[string]string;

var createAccountMutex *sync.Mutex;

func init() {
   createAccountMutex = &sync.Mutex{};
   apiUsers = make(map[string]*model.MemoryUser);
   apiSessions = make(map[string]string);
}

func GetUser(username string) (*model.MemoryUser, bool) {
   user, ok := apiUsers[username];
   return user, ok;
}

// Returns the token.
func AuthenticateUser(username string, weakhash string) (string, error) {
   user, exists := apiUsers[username];
   if (!exists) {
      return "", apierrors.TokenValidationError{apierrors.TOKEN_AUTH_BAD_CREDENTIALS};
   }

   err := bcrypt.CompareHashAndPassword([]byte(user.Passhash), []byte(weakhash));
   if (err != nil) {
      return "", apierrors.TokenValidationError{apierrors.TOKEN_AUTH_BAD_CREDENTIALS};
   }

   token, _:= generateToken();
   apiSessions[token] = username;

   // Ensure that any partition credentials are decrypted.
   user.DecryptPartitionCredentials(weakhash)

   return token, nil;
}

// Validate the token and get back the token's secret.
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

func SaveUsers() {
   SaveUsersFile(goconfig.GetString("usersFile"), apiUsers);
}

func SaveUsersFile(usersFile string, usersMap map[string]*model.MemoryUser) {
   fileUsers := make([]model.DiskUser, 0);
   for _, user := range(usersMap) {
      fileUsers = append(fileUsers, user.DiskUser);
   }

   jsonString, err := util.ToJSONPretty(fileUsers);
   if (err != nil) {
      golog.ErrorE("Unable to marshal apiUsers", err);
      return;
   }

   err = ioutil.WriteFile(usersFile, []byte(jsonString), 0600);
   if (err != nil) {
      golog.ErrorE("Unable to save apiUsers", err);
   }
}

func LoadUsers() {
   apiUsers = LoadUsersFromFile(goconfig.GetString("usersFile"));
}

func LoadUsersFromFile(usersFile string) map[string]*model.MemoryUser {
   usersMap := make(map[string]*model.MemoryUser);

   data, err := ioutil.ReadFile(usersFile);
   if (err != nil) {
      golog.ErrorE("Unable to read apiUsers file", err);
      return usersMap;
   }

   var fileUsers []model.DiskUser;
   err = json.Unmarshal(data, &fileUsers);
   if (err != nil) {
      golog.ErrorE("Unable to unmarshal apiUsers", err);
      return usersMap;
   }

   for _, user := range(fileUsers) {
      usersMap[user.Username] = &model.MemoryUser{
         DiskUser: user,
         PartitionCredentials: nil,
      };
   }

   return usersMap;
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
