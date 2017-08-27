"use strict";

var filebrowser = filebrowser || {};

filebrowser.DirEnt = function(id, name, modDate, size, isDir) {
   this.id = id;
   this.name = name;
   this.modDate = modDate;
   this.size = size;
   this.isDir = isDir;
   this.cacheTime = null;
}

filebrowser.Dir = function(id, name, modDate) {
   filebrowser.DirEnt.call(this, id, name, modDate, 0, true);
   this.children = [];
}

filebrowser.Dir.prototype = Object.create(filebrowser.DirEnt.prototype);
filebrowser.Dir.prototype.constructor = filebrowser.Dir;

filebrowser.File = function(id, name, modDate, size, directLink, extraInfo) {
   extraInfo = extraInfo || {};

   filebrowser.DirEnt.call(this, id, name, modDate, size, false);
   this.extraInfo = extraInfo;
   this.directLink = directLink;

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
