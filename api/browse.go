package api;

import (
   "io"
   "mime"
   "net/http"
   "path"

   "github.com/eriq-augustine/goapi"
   "github.com/eriq-augustine/golog"

   "github.com/eriq-augustine/elfs/dirent"
   "github.com/eriq-augustine/elfs/driver"
   "github.com/eriq-augustine/elfs/user"
   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/messages"
   "github.com/eriq-augustine/elfs-api/model"

   "github.com/eriq-augustine/elfs-api/fsdriver"
);

func browse(username goapi.UserName, partition string, rawDirentId string, response http.ResponseWriter) (interface{}, int, error) {
   golog.Debug("Serving: " + partition + "::[" + rawDirentId + "]");

   // Get the driver.
   driver, err := fsdriver.GetDriver(partition);
   if (err != nil) {
      return "", 0, err;
   }

   // Auth the user for this partition.
   userId, err := auth.AuthenticateFilesystemUser(driver, string(username));
   if (err != nil) {
      return "", 0, err;
   }

   var direntId dirent.Id = dirent.Id(rawDirentId);
   if (rawDirentId == "") {
      direntId = dirent.ROOT_ID;
   }

   direntInfo, err := driver.GetDirent(userId, direntId);
   if (err != nil) {
      return "", 0, err;
   }

   if (direntInfo.IsFile) {
      return serveFile(userId, driver, direntInfo, response);
   } else {
      return serveDir(userId, driver, direntInfo);
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

   return messages.NewListDir(dirents), 0, nil;
}

// TODO(eriq): goapi needs some work to handle streaming responses.
// TODO(eriq): Also needs more work with headers. Here we are calling WriteHeaders twice.

func serveFile(userId user.Id, driver *driver.Driver, fileInfo *dirent.Dirent, response http.ResponseWriter) (interface{}, int, error) {
   // Set the content type before we write anything.
   response.Header().Set("Content-Type", mime.TypeByExtension(path.Ext(fileInfo.Name)));

   reader, err := driver.Read(userId, fileInfo.Id);
   if (err != nil) {
      return "", 0, err;
   }

   _, err = io.Copy(response, reader);
   if (err != nil) {
      return "", 0, err;
   }

   err = reader.Close();
   if (err != nil) {
      return "", 0, err;
   }

   return "", 0, nil;
}
