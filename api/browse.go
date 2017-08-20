package api;

import (
   "io"
   "mime"
   "net/http"
   "path"

   "github.com/eriq-augustine/golog"

   "github.com/eriq-augustine/elfs/dirent"
   "github.com/eriq-augustine/elfs/driver"
   "github.com/eriq-augustine/elfs-api/messages"
   "github.com/eriq-augustine/elfs-api/model"
   "github.com/eriq-augustine/elfs/user"

   "github.com/eriq-augustine/elfs-api/fsdriver"
);

// TODO(eriq): Need to auth this user against the partition they want to use.
//  Maybe have a mapping of [user][partition] => credentials

func browse(partition string, rawDirentId string, response http.ResponseWriter) (interface{}, int, error) {
   golog.Debug("Serving: " + partition + "::[" + rawDirentId + "]");

   driver, err := fsdriver.GetDriver(partition);
   if (err != nil) {
      return "", 0, err;
   }

   var direntId dirent.Id = dirent.Id(rawDirentId);
   if (rawDirentId == "") {
      direntId = dirent.ROOT_ID;
   }

   // TODO
   direntInfo, err := driver.GetDirent(user.ROOT_ID, direntId);
   if (err != nil) {
      return "", 0, err;
   }

   if (direntInfo.IsFile) {
      return serveFile(driver, direntInfo, response);
   } else {
      return serveDir(driver, direntInfo);
   }
}

func serveDir(driver *driver.Driver, dirInfo *dirent.Dirent) (interface{}, int, error) {
   // TODO
   children, err := driver.List(user.ROOT_ID, dirInfo.Id);
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

func serveFile(driver *driver.Driver, fileInfo *dirent.Dirent, response http.ResponseWriter) (interface{}, int, error) {
   // Set the content type before we write anything.
   response.Header().Set("Content-Type", mime.TypeByExtension(path.Ext(fileInfo.Name)));

   // TODO
   reader, err := driver.Read(user.ROOT_ID, fileInfo.Id);
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
