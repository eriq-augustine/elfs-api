"use strict";

// The cache will always guarentee that a cached dirent's parent has been loaded.

var filebrowser = filebrowser || {};
filebrowser.cache = filebrowser.cache || {};

// Start empty.
filebrowser.cache._fileCache = filebrowser.cache._fileCache || {};
filebrowser.cache._dirCache = filebrowser.cache._dirCache || {};

filebrowser.cache._initComplete = false;

filebrowser.cache._db = null;
filebrowser.cache._DB_VERSION = 1;
filebrowser.cache._DB_NAME = 'FILEBROWSER_CACHE';
// Unlike the memory cache, we don't need to separate the files and dirs.
filebrowser.cache._STORE_NAME = 'Dirents';

// Init the cache system, which involves loading the indexed db.
// If the cache has already been initialized, then the callback will not be called and nothing will happen.
// Otherwise, the cache will init and call the callabck when finished.
filebrowser.cache._init = function(callback) {
   if (filebrowser.cache._initComplete) {
      return;
   }
   filebrowser.cache._initComplete = true;

   // Check for indexedDB
   if (!("indexedDB" in window)) {
      callback();
      return;
   }

   var openRequest = indexedDB.open(filebrowser.cache._DB_NAME, filebrowser.cache._DB_VERSION);

   openRequest.onupgradeneeded = function(ev) {
      var db = ev.target.result;

      if (!db.objectStoreNames.contains(filebrowser.cache._STORE_NAME)) {
         db.createObjectStore(filebrowser.cache._STORE_NAME);
      }
   }

   openRequest.onsuccess = function(ev) {
      filebrowser.cache._db = ev.target.result;

      // Load up all dirents from the db.
      filebrowser.cache._loadCacheFromDB(function() {
         if (callback) {
            callback();
         }
      });
   }

   openRequest.onerror = function(ev) {
      console.log("Filed to open an IndexedDB", ev);
   }

   openRequest.onblocked = function(ev) {
      console.log("IndexedDB blocked, try closing other tabs and reloading", ev);
   }
}

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
      // Besides being forced, dirs get updated if they are now fully fetched and were not before.
      if (force || !filebrowser.cache._dirCache[dirent.id] ||
            (dirent.fullyFetched && !filebrowser.cache._dirCache[dirent.id].fullyFetched)) {
         filebrowser.cache._dirCache[dirent.id] = dirent;
         filebrowser.cache._dbCachePut(dirent);
      }
   } else {
      if (force || !filebrowser.cache._fileCache[dirent.id]) {
         filebrowser.cache._fileCache[dirent.id] = dirent;
         filebrowser.cache._dbCachePut(dirent);
      }
   }
}

// If |repopulate| is true, then we will issue a load for the entry.
// Otherwise, just remove it.
filebrowser.cache.refreshEntry = function(dirent, repopulate, callback) {
   // Simple files are simple to refresh.
   if (!dirent.isDir && !dirent.isExtractedArchive) {
      delete filebrowser.cache._fileCache[dirent.id];
      filebrowser.cache._dbCacheRemove(dirent);
   } else {
      // Archived files and dirs are harder to refresh.
      // First clear all the descendents, but don't repopulate them.
      dirent.children.forEach(function(childId) {
         filebrowser.cache.refreshEntry(filebrowser.cache.listingFromCache(childId), false);
      });

      // Now we can clear the parent.
      if (dirent.isDir) {
         delete filebrowser.cache._dirCache[dirent.id];
      } else {
         delete filebrowser.cache._fileCache[dirent.id];
      }

      filebrowser.cache._dbCacheRemove(dirent);
   }

   // If we need to repopulate, preform a new fetch.
   if (repopulate) {
      filebrowser.cache.loadCache(dirent.id, callback);
   } else if (callback) {
      callback();
   }
}

filebrowser.cache._dbCachePut = function(dirent) {
   if (!filebrowser.cache._db) {
      return;
   }

   var transaction = filebrowser.cache._db.transaction([filebrowser.cache._STORE_NAME], 'readwrite');
   var store = transaction.objectStore(filebrowser.cache._STORE_NAME);
   var request = store.put(dirent, dirent.id);

   // For the most part, ignore the result.
   // Just log it and go on.
   request.onerror = function(err) {
      console.log("Failed to add a dirent to the db cache.", err);
   };
}

filebrowser.cache._dbCacheRemove = function(dirent) {
   if (!filebrowser.cache._db) {
      return;
   }

   var transaction = filebrowser.cache._db.transaction([filebrowser.cache._STORE_NAME], 'readwrite');
   var store = transaction.objectStore(filebrowser.cache._STORE_NAME);
   var request = store.delete(dirent.id);

   // For the most part, ignore the result.
   // Just log it and go on.
   request.onerror = function(err) {
      console.log("Failed to delete a dirent from the db cache.", err);
   };
}

// Load up all dirents from the db.
filebrowser.cache._loadCacheFromDB = function(callback) {
   if (!filebrowser.cache._db) {
      return;
   }

   var transaction = filebrowser.cache._db.transaction([filebrowser.cache._STORE_NAME], 'readonly');

   var store = transaction.objectStore(filebrowser.cache._STORE_NAME);
   var cursor = store.openCursor();

   cursor.onsuccess = function(ev) {
      var res = ev.target.result;
      if (res) {
         if (res.value.isDir) {
            filebrowser.cache._dirCache[res.value.id] = res.value;
         } else {
            var fileInfo = res.value;

            // If this file has an object URL, then recreate the direct link.
            if (fileInfo.isObjectURL) {
               fileInfo.directLink = URL.createObjectURL(fileInfo.rawFile);
            }

            filebrowser.cache._fileCache[fileInfo.id] = fileInfo;
         }

         res.continue();
      } else {
         if (callback) {
            callback();
         }
      }
   };
}
