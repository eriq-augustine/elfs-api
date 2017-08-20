package auth;

// Authentication at the filesystem level.
// Note that there is a second level for authentication to each partition.
// Auth the user and give them a token that does not expire.
// However the token is stored in memory, so a server restart invalidates it.

import (
   "fmt"
   "sync"

   "github.com/eriq-augustine/elfs/driver"
   "github.com/eriq-augustine/elfs/user"
   "github.com/pkg/errors"
)

// {"apiUsername::partitionConnectionString": fileSystemUserId}
var filesystemSessions map[string]user.Id;
var filesystemAuthMutex *sync.Mutex;

func init() {
   filesystemAuthMutex = &sync.Mutex{};
   filesystemSessions = make(map[string]user.Id);
}

// User's filesystem id (user.Id).
func AuthenticateFilesystemUser(fsDriver *driver.Driver, apiUsername string) (user.Id, error) {
   var id string = fmt.Sprintf("%s::%s", apiUsername, fsDriver.ConnectionString());

   apiUser, ok := apiUsers[apiUsername];
   if (!ok) {
      return user.EMPTY_ID, errors.New("Could not find api user with given username.");
   }

   userId, ok := filesystemSessions[id];
   if (ok) {
      return userId, nil;
   }

   filesystemAuthMutex.Lock();
   defer filesystemAuthMutex.Unlock();

   credentials, ok := apiUser.PartitionCredentials[fsDriver.ConnectionString()];
   if (!ok) {
      return user.EMPTY_ID, errors.New("User does not have credentials for this filesystem.");
   }

   fsUser, err := fsDriver.UserAuth(credentials.Username, credentials.Weakhash);
   if (err != nil) {
      return user.EMPTY_ID, errors.WithStack(err);
   }

   filesystemSessions[id] = fsUser.Id;

   return fsUser.Id, nil;
}
