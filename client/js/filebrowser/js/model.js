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
   this.children = [];
}

filebrowser.Dir.prototype = Object.create(filebrowser.DirEnt.prototype);
filebrowser.Dir.prototype.constructor = filebrowser.Dir;

filebrowser.File = function(id, name, modDate, size, directLink, parentId, extraInfo) {
   extraInfo = extraInfo || {};

   filebrowser.DirEnt.call(this, id, name, modDate, size, false, parentId);
   this.extraInfo = extraInfo;
   this.directLink = directLink;
   this.isExtractedArchive = false;
   this.archiveChildren = [];

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
