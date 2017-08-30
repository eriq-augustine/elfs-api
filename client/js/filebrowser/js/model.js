"use strict";

var filebrowser = filebrowser || {};

filebrowser.DirEnt = function(id, name, modDate, size, isDir, parentId) {
   this.id = id;
   this.name = name;
   this.modDate = modDate;
   this.size = size;
   this.isDir = isDir;
   this.parentId = parentId;
   this.cacheTime = null;
}

filebrowser.Dir = function(id, name, modDate, parentId) {
   filebrowser.DirEnt.call(this, id, name, modDate, 0, true, parentId);

   // If this is false, then we have not fully fetched this this.
   // This means we have seen this as a child in an ls, but have
   // not listed this dir in turn.
   this.fullyFetched = false;
   this.children = [];
}

filebrowser.Dir.prototype = Object.create(filebrowser.DirEnt.prototype);
filebrowser.Dir.prototype.constructor = filebrowser.Dir;

filebrowser.File = function(id, name, modDate, size, directLink, parentId) {
   filebrowser.DirEnt.call(this, id, name, modDate, size, false, parentId);

   this.directLink = directLink;
   this.isExtractedArchive = false;
   this.archiveChildren = [];

   this.isDataURL = false;
   if (this.directLink && this.directLink.startsWith('data:')) {
      this.isDataURL = true;
   }

   if (name.indexOf('.') > -1) {
      var nameParts = name.match(/^(.*)\.([^\.]*)$/);
      this.basename = nameParts[1];
      this.extension = nameParts[2].toLowerCase();
   } else {
      this.basename = name;
      this.extension = '';
   }
}

filebrowser.File.prototype = Object.create(filebrowser.DirEnt.prototype);
filebrowser.File.prototype.constructor = filebrowser.File;
