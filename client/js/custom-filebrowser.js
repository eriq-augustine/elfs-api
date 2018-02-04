"use strict";

var mediaserver = mediaserver || {};

// Attach the token to the request.
mediaserver._prepareDirectLink = function(dirent) {
   if (dirent.isDir) {
      return "#";
   }

   return mediaserver.util.getContentsPath(dirent.id);
}

// Convert a backend DirEntry to a frontend DirEnt.
mediaserver._convertBackendDirEntry = function(dirEntry) {
   // Note that root has an empty name (and id).
   if (dirEntry.IsFile) {
      return new filebrowser.File(dirEntry.Id, dirEntry.Name, new Date(dirEntry.ModTimestamp * 1000),
            dirEntry.Size, dirEntry.Parent);
   } else {
      return new filebrowser.Dir(dirEntry.Id, dirEntry.Name, new Date(dirEntry.ModTimestamp * 1000), dirEntry.Parent);
   }
}

mediaserver._fetch = function(id, callback) {
   id = (id || '').trim();

   var params = {
      "id": id
   };
   var url = mediaserver.apiBrowserPath + '?' + $.param(params);

   $.ajax(url, {
      dataType: 'json',
      headers: {'Authorization': mediaserver.apiToken},
      error: function(request, textStatus, error) {
         // Permission denied.
         if (request.status == 401) {
            alert('Need to login again.');
            // TODO(eriq): function
            mediaserver.apiToken = undefined;
            mediaserver.store.unset(mediaserver.store.TOKEN_KEY);
            mediaserver._setupLogin();
            return;
         }

         // TODO(eriq): log?
         console.log("Error getting data");
         console.log(request);
         console.log(textStatus);
      },
      success: function(data) {
         if (!data.Success) {
            // TODO(eriq): more
            console.log("Unable to get listing");
            console.log(data);
            return;
         }

         var dirents = [];
         var parentId = undefined;

         if (data.IsDir) {
            var dir = mediaserver._convertBackendDirEntry(data.DirEntry);

            // Fill in the children.
            var children = [];
            data.Children.forEach(function(child) {
               var child = mediaserver._convertBackendDirEntry(child);

               children.push(child.id);
               dirents.push(child);
            });

            dir.children = children;
            dir.fullyFetched = true;

            parentId = dir.parentId;
            dirents.push(dir);
         } else {
            var file = mediaserver._convertBackendDirEntry(data.DirEntry);

            parentId = file.parentId;
            dirents.push(file);
         }

         callback(dirents, parentId);
      }
   });
}
