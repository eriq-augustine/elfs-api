"use strict";

var filebrowser = filebrowser || {};
filebrowser.archive = filebrowser.archive || {};

// TODO(eriq): Put up a modal.
filebrowser.archive.extract = function(id) {
   zip.workerScriptsPath = 'js/filebrowser/vendor/zipjs/';

   var fileInfo = filebrowser.cache.listingFromCache(id);
   if (!fileInfo) {
      throw "Attempt to extract uncached file: [" + id + "].";
   }

   if (fileInfo.isDir) {
      throw "Attempt to extract a dir: [" + id + "].";
   }

   if (fileInfo.isDir) {
      throw "Attempt to extract a non-zip file: [" + fileInfo.name + "].";
   }

   var modal = filebrowser.archive._openModal(fileInfo);

   // Fetch the data as a blob.
   $.ajax({
      url: fileInfo.directLink,
      type: "GET",
      dataType: 'binary',
      processData: false,
      success: function(blob) {
         zip.createReader(new zip.BlobReader(blob), function(reader) {
            filebrowser.archive._buildDirentsFromReader(reader, fileInfo, modal);
         }, function(error) {
            // TODO(eriq): more
            console.log("Error");
            console.log(error);
         });
      }
   });
}

// Returns the modal.
filebrowser.archive._openModal = function(fileInfo) {
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

   return modal;
}

filebrowser.archive._buildDirentsFromReader = function(reader, fileInfo, modal) {
   // get all entries from the zip
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

      // Mark all child directories as fully fetched (so we don't make requests to teh server for an ls).
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
               modal.close();
            }
         });
      }
   });
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
