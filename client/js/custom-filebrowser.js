"use strict";

// Frontend ids are "partition::backendId".
// We will spoof the partitions as directories at root.

var mediaserver = mediaserver || {};

mediaserver._FAKEROOT_ID = '';

// Convert a backend DirEntry to a frontend DirEnt.
mediaserver._convertBackendDirEntry = function(dirEntry, partition) {
   var id = mediaserver.util.frontendId(dirEntry.Id, partition);
   var parentId = mediaserver.util.frontendId(dirEntry.Parent, partition);

   // If we are a partition root, then our parent id is an empty string.
   if (id == parentId) {
      parentId = mediaserver._FAKEROOT_ID;
   }

   // In the case of a root entry (empty name), rename it to the partition's name (minus the connection type).
   var name = dirEntry.Name;
   if (name == '') {
      name = mediaserver.util.partitionName(partition);
   }

   if (dirEntry.IsFile) {
      return new filebrowser.File(id, name, new Date(dirEntry.ModTimestamp * 1000),
            dirEntry.Size, mediaserver.util.getContentsPath(dirEntry), parentId);
   } else {
      return new filebrowser.Dir(id, name, new Date(dirEntry.ModTimestamp * 1000), parentId);
   }
}

mediaserver._fetch = function(id, callback) {
   id = (id || '').trim();

   // On an empty id, we will get the partitions and spoof them as dirs.
   if (id == '') {
      mediaserver._fetchPartitions(callback);
      return;
   }

   if (id == '') {
      console.log("Error - Fetch called with an empty id.");
      throw "Error - Fetch called with an empty id.";
      return;
   }

   var [partition, backendId] = mediaserver.util.backendId(id);

   var params = {
      "id": backendId,
      "partition": partition
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
            var dir = mediaserver._convertBackendDirEntry(data.DirEntry, partition);

            // Fill in the children.
            var children = [];
            data.Children.forEach(function(child) {
               var child = mediaserver._convertBackendDirEntry(child, partition);

               children.push(child.id);
               dirents.push(child);
            });

            dir.children = children;
            dir.fullyFetched = true;

            parentId = dir.parentId;
            dirents.push(dir);
         } else {
            var file = mediaserver._convertBackendDirEntry(data.DirEntry, partition);

            parentId = file.parentId;
            dirents.push(file);
         }

         callback(dirents, parentId);
      }
   });
}

mediaserver._fetchPartitions = function(callback) {
   var url = mediaserver.apiPartitionsPath;

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
            console.log("Unable to get partitions");
            console.log(data);
            return;
         }

         var dirents = [];

         // Create a fake directory whose children are the roots of the respective partitions.
         // The fake root is its own parent.
         var fakeRoot = new filebrowser.Dir(mediaserver._FAKEROOT_ID, '/', Date.now(), mediaserver._FAKEROOT_ID);

         var children = [];
         data.Partitions.forEach(function(partition) {
            var id = mediaserver.util.frontendId('', partition);
            var name = mediaserver.util.partitionName(partition);

            children.push(id);
            dirents.push(new filebrowser.Dir(id, name, Date.now(), mediaserver._FAKEROOT_ID));
         });

         fakeRoot.children = children;
         fakeRoot.fullyFetched = true;
         dirents.push(fakeRoot);

         callback(dirents, mediaserver._FAKEROOT_ID);
      }
   });
}
