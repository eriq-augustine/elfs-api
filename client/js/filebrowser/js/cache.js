"use strict";

// The cache will always guarentee that a cached dirent's parent has been loaded.

var filebrowser = filebrowser || {};
filebrowser.cache = filebrowser.cache || {};

// Start empty.
filebrowser.cache._fileCache = filebrowser.cache._fileCache || {};
filebrowser.cache._dirCache = filebrowser.cache._dirCache || {};

// |requireFull| indicates that if this entry is a dir, it needs to be fully cached.
// This means that we have done an ls on it and have all the children.
// If we are just doing something like an ls on its parent, however,
// then we only need to dir's info and not its children.
filebrowser.cache.listingFromCache = function(id, requireFull) {
   var cachedListing = undefined;

   // See if it is a file.
   cachedListing = filebrowser.cache._fileCache[id];
   if (cachedListing) {
      return cachedListing;
   }

   // See if it is a dir.
   cachedListing = filebrowser.cache._dirCache[id];
   if (cachedListing) {
      if (requireFull && !cachedListing.fullyFetched) {
         return undefined;
      }

      return cachedListing;
   }

   // Cache miss.
   return undefined;
}

// Fetch and load not just the given entry, but also ensure that all parents until root are also cached.
filebrowser.cache.loadCache = function(id, callback) {
   filebrowser.customFetch(id, function(dirents, parentId) {
      dirents.forEach(function(dirent) {
         filebrowser.cache.cachePut(dirent);
      });

      // If the parent is cached, then just callback.
      // Otherwise, we need to cache it.
      if (filebrowser.cache.listingFromCache(parentId)) {
         if (callback) {
            callback();
         }
      } else {
         filebrowser.cache.loadCache(parentId, callback);
      }
   });
}

// A direct put straight into the cache.
// This should very rarely be called by the user.
filebrowser.cache.cachePut = function(dirent, force) {
   dirent.cacheTime = Date.now();
   if (dirent.isDir) {
      if (force || !filebrowser.cache._dirCache[dirent.id]) {
         filebrowser.cache._dirCache[dirent.id] = dirent;
      }
   } else {
      if (force || !filebrowser.cache._fileCache[dirent.id]) {
         filebrowser.cache._fileCache[dirent.id] = dirent;
      }
   }
}
