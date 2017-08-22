package api;

import (
   "mime"
   "net/http"
   "path"

   "github.com/eriq-augustine/goapi"
   "github.com/eriq-augustine/golog"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs/dirent"
   "github.com/eriq-augustine/elfs/driver"
   "github.com/eriq-augustine/elfs/user"
   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/messages"
   "github.com/eriq-augustine/elfs-api/model"

   "github.com/eriq-augustine/elfs-api/fsdriver"
);

func browse(username goapi.UserName, partition string, rawDirentId string) (interface{}, int, string, error) {
   golog.Debug("Serving: " + partition + "::[" + rawDirentId + "]");

   apiUser, ok := auth.GetUser(string(username));
   if (!ok) {
      // This should never happen since we made it past the auth middleware.
      return "", 0, "", errors.New("User does not exist");
   }

   // Get the driver.
   driver, err := fsdriver.GetDriver(apiUser, partition);
   if (err != nil) {
      return "", 0, "", err;
   }

   // Auth the user for this partition.
   userId, err := auth.AuthenticateFilesystemUser(driver, string(username));
   if (err != nil) {
      return "", http.StatusUnauthorized, "", err;
   }

   var direntId dirent.Id = dirent.Id(rawDirentId);
   if (rawDirentId == "") {
      direntId = dirent.ROOT_ID;
   }

   direntInfo, err := driver.GetDirent(userId, direntId);
   if (err != nil) {
      return "", http.StatusNotFound, "", err;
   }

   if (direntInfo.IsFile) {
      return serveFile(userId, driver, direntInfo);
   } else {
      return serveDir(userId, driver, direntInfo);
   }
}

func serveDir(userId user.Id, driver *driver.Driver, dirInfo *dirent.Dirent) (interface{}, int, string, error) {
   children, err := driver.List(userId, dirInfo.Id);
   if (err != nil) {
      return "", 0, "", err;
   }

   var dirents []*model.DirEntry = make([]*model.DirEntry, 0, len(children));
   for _, child := range(children) {
      dirents = append(dirents, model.DirEntryFromDriver(child));
   }

   return messages.NewListDir(dirents), 0, "", nil;
}

func serveFile(userId user.Id, driver *driver.Driver, fileInfo *dirent.Dirent) (interface{}, int, string, error) {
   reader, err := driver.Read(userId, fileInfo.Id);
   if (err != nil) {
      return "", 0, "", err;
   }

   return reader, 0, mime.TypeByExtension(path.Ext(fileInfo.Name)), nil;
}
