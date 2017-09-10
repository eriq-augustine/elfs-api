"use strict";

var filebrowser = filebrowser || {};
filebrowser.archive = filebrowser.archive || {};

filebrowser.archive._initComplete = false;
filebrowser.archive._modal = null;

filebrowser.archive._TAR_DIR_TYPE = '5';

// Some libraries will need some initialization.
filebrowser.archive._init = function() {
   if (filebrowser.archive._initComplete) {
      return;
   }

   zip.workerScriptsPath = 'js/filebrowser/vendor/zipjs/';

   filebrowser.archive._initComplete = true;
}

filebrowser.archive.extract = function(id) {
   filebrowser.archive._init();

   var fileInfo = filebrowser.cache.listingFromCache(id);
   if (!fileInfo) {
      throw "Attempt to extract uncached file: [" + id + "].";
   }

   if (fileInfo.isDir) {
      throw "Attempt to extract a dir: [" + id + "].";
   }

   if (!filebrowser.filetypes.isFileClass(fileInfo, 'ex-archive')) {
      throw "We do not know how to extract this archive type: [" + fileInfo.name + "].";
   }

   // The type of data we want to get the response as.
   // Default to a blob.
   var responseType = 'blob';
   if (fileInfo.extension == 'tar') {
      responseType = 'arraybuffer';
   }

   var modal = filebrowser.archive._openModal(fileInfo);

   // Fetch the data as a blob.
   $.ajax({
      url: filebrowser.getDirectLink(fileInfo),
      type: "GET",
      dataType: 'binary',
      processData: false,
      responseType: responseType,
      success: function(blob) {
         if (fileInfo.extension == 'zip') {
            filebrowser.archive._unzip(blob, fileInfo);
         } else if (fileInfo.extension == 'tar') {
            filebrowser.archive._untar(blob, fileInfo);
         } else {
            throw "Unknown extension for extraction: [" + fileInfo.extension + "].";
         }
      }
   });
}

// Returns the modal.
filebrowser.archive._openModal = function(fileInfo) {
   if (filebrowser.archive._modal) {
      return;
   }

   var modal = new tingle.modal({
      footer: false,
      stickyFooter: false,
      cssClass: ['filebrowser-modal'],
      closeMethods: [],
      onOpen: function() {},
      onClose: function() {},
   });

   // set content
   modal.setContent(`
      <div class='filebrowser-modal-content'>
         <h2>Extracting ` + fileInfo.name + ` ...</h2>

         <div class='filebrowser-modal-loader'>
            <div class="boxes-loader">
               <div class="boxes-loader-square" id="boxes-loader-square-0"></div>
               <div class="boxes-loader-square" id="boxes-loader-square-1"></div>
               <div class="boxes-loader-square" id="boxes-loader-square-2"></div>
               <div class="boxes-loader-square" id="boxes-loader-square-3"></div>
               <div class="boxes-loader-square" id="boxes-loader-square-4"></div>
               <div class="boxes-loader-square" id="boxes-loader-square-5"></div>
               <div class="boxes-loader-square" id="boxes-loader-square-6"></div>
            </div>
         </div>
      </div>
   `);

   // open modal
   modal.open();
   filebrowser.archive._modal = modal;
}

filebrowser.archive._closeModal = function() {
   if (!filebrowser.archive._modal) {
      return;
   }

   filebrowser.archive._modal.close();
   filebrowser.archive._modal = null;
}

filebrowser.archive._unzip = function(blob, parentInfo) {
   zip.createReader(new zip.BlobReader(blob), function(reader) {
      // Get all entries from the zip
      reader.getEntries(function(entries) {
         entries.forEach(function(entry) {
            var path = entry.filename.replace(/\/$/, '');
            var basename = filebrowser.util.basename(path);
            var modDate = new Date(entry.lastModDateRaw * 1000);

            entry.path = path;
            entry.modDate = entry.lastModDateRaw * 1000;
            entry.isDir = entry.directory;
            entry.size = entry.uncompressedSize;
         });

         // Keep track of how many files have extracted.
         var count = 0;

         // Extract all the files.
         entries.forEach(function(entry) {
            entry.getData(new zip.BlobWriter(), function(data) {
               count++;
               entry.blob = data;

               if (count == entries.length) {
                  // Close the reader.
                  reader.close();

                  // Construct the proper structurs.
                  filebrowser.archive._buildDirent(entries, parentInfo);

                  // Redirect to the newly extracted archive.
                  filebrowser.nav.changeTarget(parentInfo.id, true);
                  filebrowser.archive._closeModal();
               }
            });
         });
      });
   }, function(error) {
      // TODO(eriq): More
      console.log("Error");
      console.log(error);
   });
}

// We require the source data as an ArrayBuffer.
filebrowser.archive._untar = function(blob, archiveFileInfo) {
   untar(blob).then(
      function(entries) {
         // Just reuse the existing entties and make sure they have the correct properties.
         entries.forEach(function(entry) {
            entry.path = entry.name.replace(/\/$/, '');
            entry.modDate = entry.modificationTime * 1000;
            entry.isDir = entry.type == filebrowser.archive._TAR_DIR_TYPE;
            // size and blob are already present.
         });

         filebrowser.archive._buildDirent(entries, archiveFileInfo);

         // Redirect to the newly extracted archive.
         filebrowser.nav.changeTarget(archiveFileInfo.id, true);
         filebrowser.archive._closeModal();
      },
      function(err) {
         // TODO(eriq): More
         console.log("Failed to untar");
         console.log(err);
      }
   );
}

// Get a collection of entries that are in the archive (order does not matter),
// and build up a dirent in the cache to mimic a directory.
// All entries will be placed in the cache.
// Entries must have the following properies:
//  - path - path inside the archive. This will be used for identification, naming, and mime.
//  - modDate - modDate in ms. Feel free to use the parents mod if you don't know it.
//  - isDir - true if this entry is a dir.
//  - size - the uncompressed size of the entry, doesn't matter for dirs.
//  - blob - the actual data as a blob, doesn't matter for dirs.
filebrowser.archive._buildDirent = function(entries, parentInfo) {
   // Key by the dirent's path (not id) to make it easier to connect parents later.
   var files = {};
   var dirs = {};
   var nextId = 0;

   // Make a first pass to just construct all the dirents.
   // Don't connect parents yet.
   for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];

      var path = entry.path.replace(/\/$/, '');
      var id = parentInfo.id + '_' + filebrowser.util.zeroPad(nextId++, 6);
      var basename = filebrowser.util.basename(path);
      var modDate = new Date(entry.modDate);

      if (entry.isDir) {
         var dirInfo = new filebrowser.Dir(id, basename, modDate, undefined);
         dirInfo.isExtractedChild = true;

         // Mark all child directories as fully fetched (so we don't make requests to the server for an ls).
         dirInfo.fullyFetched = true;

         dirs[path] = dirInfo;
      } else {
         var mime = filebrowser.filetypes.getMimeForExension(filebrowser.util.ext(path));
         var rawFile = new File([entry.blob], basename, {type: mime});

         var fileInfo = new filebrowser.File(id, basename, modDate, entry.size, undefined, undefined);
         fileInfo.isExtractedChild = true;

         fileInfo.rawFile = rawFile;
         fileInfo.directLink = URL.createObjectURL(rawFile);
         fileInfo.isObjectURL = true;

         files[path] = fileInfo;
      }
   }

   // Mark the archive as extracted.
   parentInfo.isExtractedArchive = true;

   // Connect parents and collect children.
   filebrowser.archive._connectParents(dirs, dirs, parentInfo);
   filebrowser.archive._connectParents(files, dirs, parentInfo);

   // Cache the entries.
   filebrowser.archive._cacheEntries(parentInfo, files, dirs);
}

filebrowser.archive._connectParents = function(dirents, dirs, fileInfo) {
   for (var path in dirents) {
      var parentPath = filebrowser.util.dir(path);

      if (dirs[parentPath]) {
         dirents[path].parentId = dirs[parentPath].id;

         // Also connect the child on the parent's side.
         // Use the same memory.
         dirs[parentPath].children.push(dirents[path].id);
      } else {
         // Any entry without a parent gets the archive as a parent.
         dirents[path].parentId = fileInfo.id;

         // Stach away the root children specially.
         fileInfo.children.push(dirents[path].id);
      }
   }
}

filebrowser.archive._cacheEntries = function(parentInfo, files, dirs) {
   // Force a cache update if the parent (since it has been extracted).
   filebrowser.cache.cachePut(parentInfo, true);

   for (var path in dirs) {
      var dirent = dirs[path];
      filebrowser.cache.cachePut(dirent);
   }

   for (var path in files) {
      var dirent = files[path];
      filebrowser.cache.cachePut(dirent);
   }
}
