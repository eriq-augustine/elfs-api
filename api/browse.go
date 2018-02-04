package api;

import (
   "mime"
   "net/http"
   "path"

   "github.com/eriq-augustine/elfs/dirent"
   "github.com/eriq-augustine/elfs/driver"
   "github.com/eriq-augustine/elfs/user"
   "github.com/eriq-augustine/goapi"
   "github.com/eriq-augustine/golog"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/messages"
   "github.com/eriq-augustine/elfs-api/model"
);

func init() {
   // Add webvtt into the mime type.
   mime.AddExtensionType(".vtt", "text/vtt");
}

func browse(username goapi.UserName, rawDirentId string) (interface{}, int, error) {
   golog.Debug("Serving: [" + rawDirentId + "]");

   user, ok := auth.GetUser(string(username));
   if (!ok) {
      // This should never happen since we made it past the auth middleware.
      return "", 0, errors.New("User does not exist");
   }

   var driver *driver.Driver = fsdriver.GetDriver();

   var direntId dirent.Id = dirent.Id(rawDirentId);
   if (rawDirentId == "") {
      direntId = dirent.ROOT_ID;
   }

   direntInfo, err := driver.GetDirent(user.Id, direntId);
   if (err != nil) {
      return "", http.StatusNotFound, err;
   }

   if (direntInfo.IsFile) {
      return messages.NewFileInfo(model.DirEntryFromDriver(direntInfo)), 0, nil;
   } else {
      return serveDir(user.Id, driver, direntInfo);
   }
}

func serveDir(userId user.Id, driver *driver.Driver, dirInfo *dirent.Dirent) (interface{}, int, error) {
   children, err := driver.List(userId, dirInfo.Id);
   if (err != nil) {
      return "", 0, err;
   }

   var dirents []*model.DirEntry = make([]*model.DirEntry, 0, len(children));
   for _, child := range(children) {
      dirents = append(dirents, model.DirEntryFromDriver(child));
   }

   return messages.NewListDir(model.DirEntryFromDriver(dirInfo), dirents), 0, nil;
}

func getFileContents(username goapi.UserName, rawFileId string) (interface{}, int, string, error) {
   golog.Debug("Serving Contents: [" + rawFileId + "]");

   user, ok := auth.GetUser(string(username));
   if (!ok) {
      // This should never happen since we made it past the auth middleware.
      return "", 0, "", errors.New("User does not exist");
   }

   var driver *driver.Driver = fsdriver.GetDriver();

   fileInfo, err := driver.GetDirent(user.Id, dirent.Id(rawFileId));
   if (err != nil) {
      return "", http.StatusNotFound, "", err;
   }

   if (!fileInfo.IsFile) {
      return "", http.StatusBadRequest, "", errors.New("Cannot get the file contents of a dir.");
   }

   reader, err := driver.Read(user.Id, fileInfo.Id);
   if (err != nil) {
      return "", 0, "", err;
   }

   return reader, 0, mime.TypeByExtension(path.Ext(fileInfo.Name)), nil;
}
