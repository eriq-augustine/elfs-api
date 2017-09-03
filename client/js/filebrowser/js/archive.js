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

// TODO(eriq): Put up a modal.
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
   var responseType = 'binary';
   if (fileInfo.extension == 'tar') {
      responseType = 'arraybuffer';
   }

   var modal = filebrowser.archive._openModal(fileInfo);

   // Fetch the data as a blob.
   $.ajax({
      url: fileInfo.directLink,
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

filebrowser.archive._unzip = function(blob, fileInfo) {
   zip.createReader(new zip.BlobReader(blob), function(reader) {
      filebrowser.archive._unzipFromReader(reader, fileInfo);
   }, function(error) {
      // TODO(eriq): more
      console.log("Error");
      console.log(error);
   });
}

filebrowser.archive._unzipFromReader = function(reader, fileInfo) {
   // Get all entries from the zip
   reader.getEntries(function(entries) {
      // Key by the dirent's path (not id) to make it easier to connect parents later.
      var files = {};
      var dirs = {};
      var nextId = 0;

      // Keep track of the entries for when we extract them.
      // {id: entry}
      var entryIds = {};

      // Make a first pass to just construct all the dirents.
      // Don't connect parents yet.
      for (var i = 0; i < entries.length; i++) {
         var entry = entries[i];

         var path = entry.filename.replace(/\/$/, '');
         var id = fileInfo.id + '_' + filebrowser.util.zeroPad(nextId++, 6);
         var basename = filebrowser.util.basename(path);
         var modDate = new Date(entry.lastModDateRaw * 1000);

         if (entry.directory) {
            dirs[path] = new filebrowser.Dir(id, basename, modDate, undefined);
         } else {
            files[path] = new filebrowser.File(id, basename, modDate, entry.uncompressedSize, undefined, undefined);
            entryIds[id] = entry;
         }
      }

      // Mark the archive as extracted.
      fileInfo.isExtractedArchive = true;

      // Connect parents and collect children.
      filebrowser.archive._connectParents(dirs, dirs, fileInfo);
      filebrowser.archive._connectParents(files, dirs, fileInfo);

      // Mark all child directories as fully fetched (so we don't make requests to the server for an ls).
      for (path in dirs) {
         dirs[path].fullyFetched = true;
      }

      // Keep track of how many files have extracted.
      var count = 0;

      // Extract all the files into data uri's.
      for (id in entryIds) {
         var entry = entryIds[id];

         filebrowser.archive._extractEntry(id, entry, files, function(path, success) {
            count++;

            if (count == Object.keys(files).length) {
               // Close the reader.
               reader.close();

               filebrowser.archive._cacheEntries(fileInfo, files, dirs);
               filebrowser.nav.changeTarget(fileInfo.id, true);
               filebrowser.archive._closeModal();
            }
         });
      }
   });
}

// We require the source data as an ArrayBuffer.
filebrowser.archive._untar = function(blob, archiveFileInfo) {
   untar(blob).then(
      function(entries) {
         // Key by the dirent's path (not id) to make it easier to connect parents later.
         var files = {};
         var dirs = {};
         var nextId = 0;

         // Make a first pass to just construct all the dirents.
         // Don't connect parents yet.
         for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];

            var path = entry.name.replace(/\/$/, '');
            var id = archiveFileInfo.id + '_' + filebrowser.util.zeroPad(nextId++, 6);
            var basename = filebrowser.util.basename(path);
            var modDate = new Date(entry.modificationTime * 1000);

            if (entry.type == filebrowser.archive._TAR_DIR_TYPE) {
               var dirInfo = new filebrowser.Dir(id, basename, modDate, undefined);

               // Mark all child directories as fully fetched (so we don't make requests to the server for an ls).
               dirInfo.fullyFetched = true;

               dirs[path] = dirInfo;
            } else {
               var mime = filebrowser.filetypes.getMimeForExension(filebrowser.util.ext(path));
               var rawFile = new File([entry.blob], basename, {type: mime});

               var fileInfo = new filebrowser.File(id, basename, modDate, entry.size, undefined, undefined);

               fileInfo.rawFile = rawFile;
               fileInfo.directLink = URL.createObjectURL(rawFile);
               fileInfo.isObjectURL = true;

               files[path] = fileInfo;
            }
         }

         // Mark the archive as extracted.
         archiveFileInfo.isExtractedArchive = true;

         // Connect parents and collect children.
         filebrowser.archive._connectParents(dirs, dirs, archiveFileInfo);
         filebrowser.archive._connectParents(files, dirs, archiveFileInfo);

         // Cache the entries and redirect to the newly extracted archive.
         filebrowser.archive._cacheEntries(archiveFileInfo, files, dirs);
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
         fileInfo.archiveChildren.push(dirents[path].id);
      }
   }
}

filebrowser.archive._extractEntry = function(id, entry, files, callback) {
   var path = entry.filename.replace(/\/$/, '');
   var mime = filebrowser.filetypes.getMimeForExension(filebrowser.util.ext(path));

   // TODO(eriq): Check for error.
   entry.getData(new zip.BlobWriter(mime), function(data) {
      var rawFile = new File([data], files[path].name, {type: mime});

      files[path].rawFile = rawFile;
      files[path].directLink = URL.createObjectURL(rawFile);
      files[path].isObjectURL = true;
      callback(path, true);
   });
}

filebrowser.archive._cacheEntries = function(fileInfo, files, dirs) {
   for (var path in dirs) {
      var dirent = dirs[path];
      filebrowser.cache.cachePut(dirent);
   }

   for (var path in files) {
      var dirent = files[path];
      filebrowser.cache.cachePut(dirent);
   }
}
