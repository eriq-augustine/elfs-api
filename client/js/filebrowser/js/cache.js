"use strict";

var filebrowser = filebrowser || {};
filebrowser.cache = filebrowser.cache || {};

// Start empty.
filebrowser.cache._fileCache = filebrowser.cache._fileCache || {};
filebrowser.cache._dirCache = filebrowser.cache._dirCache || {};

filebrowser.cache.listingFromCache = function(id) {
   var cachedListing = undefined;

   // See if it is a file.
   cachedListing = filebrowser.cache._fileCache[id];
   if (cachedListing) {
      return cachedListing;
   }

   // See if it is a dir.
   cachedListing = filebrowser.cache._dirCache[id];
   if (cachedListing) {
      return cachedListing;
   }

   // Cache miss.
   return undefined;
}

// Fetch and load not just the given entry, but also ensure that all parents until root are also cached.
filebrowser.cache.loadCache = function(id, callback) {
   filebrowser.customFetch(id, function(isDir, dirent) {
      dirent.cacheTime = new Date();
      if (isDir) {
         filebrowser.cache._dirCache[id] = dirent;
      } else {
         filebrowser.cache._fileCache[id] = dirent;
      }

      // If the parent is cached, then just callback.
      // Otherwise, we need to cache it.
      if (filebrowser.cache.listingFromCache(dirent.parentId)) {
         callback();
      } else {
         filebrowser.cache.loadCache(dirent.parentId, callback);
      }
   });
}
