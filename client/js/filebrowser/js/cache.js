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

filebrowser.cache.loadCache = function(id, callback) {
   filebrowser.customFetch(id, function(isDir, data) {
      data.cacheTime = new Date();
      if (isDir) {
         filebrowser.cache._dirCache[id] = data;
      } else {
         filebrowser.cache._fileCache[id] = data;
      }

      callback();
   });
}
