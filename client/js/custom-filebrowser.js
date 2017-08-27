"use strict";

var mediaserver = mediaserver || {};

// Convert a backend DirEntry to a frontend DirEnt.
mediaserver._convertBackendDirEntry = function(dirEntry) {
   // TEST
   console.log(dirEntry);

   if (dirEntry.IsFile) {
      return new filebrowser.File(dirEntry.Id, dirEntry.Name, new Date(dirEntry.ModTimestamp),
            dirEntry.Size, mediaserver.util.getContentsPath(dirEntry), dirEntry.Parent);
   } else {
      return new filebrowser.Dir(dirEntry.Id, dirEntry.Name, new Date(dirEntry.ModTimestamp),
            dirEntry.Parent);
   }
}

mediaserver._fetch = function(id, callback) {
   id = id || '';

   var params = {
      "id": id,
      // TODO(eriq): get actual partition.
      "partition": 'local:/home/eriq/code/elfs/testtime'
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

         var rtnData;
         if (data.IsDir) {
            rtnData = mediaserver._convertBackendDirEntry(data.DirEntry);

            // Fill in the children.
            var children = [];
            data.Children.forEach(function(child) {
               children.push(mediaserver._convertBackendDirEntry(child));
            });

            rtnData.children = children;
         } else {
            rtnData = mediaserver._convertBackendDirEntry(data.DirEntry);
         }

         callback(!data.IsFile, rtnData);
      }
   });
}
