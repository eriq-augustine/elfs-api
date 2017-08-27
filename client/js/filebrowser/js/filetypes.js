"use strict";

var filebrowser = filebrowser || {};
filebrowser.filetypes = filebrowser.filetypes || {};

filebrowser.filetypes.templates = filebrowser.filetypes.templates || {};
filebrowser.filetypes.overrides = filebrowser.filetypes.overrides || {};

filebrowser.filetypes.fileClasses = filebrowser.filetypes.fileClasses || {
   'text':     {renderFunction: _renderGeneralIFrame, icon: 'file-text-o'},
   'audio':    {renderFunction: _renderAudio,         icon: 'file-audio-o'},
   'image':    {renderFunction: _renderImage,         icon: 'file-image-o'},
   'general':  {renderFunction: _renderGeneral,       icon: 'file-o'},
   'iframe':   {renderFunction: _renderGeneralIFrame, icon: 'file-o'},
   'html':     {renderFunction: _renderGeneralIFrame, icon: 'file-code-o'},
   'video':    {renderFunction: _renderVideo,         icon: 'file-video-o'},
   'code':     {renderFunction: _renderGeneralIFrame, icon: 'file-code-o'},
   'archive':  {renderFunction: _renderGeneralIFrame, icon: 'file-archive-o'},
};

filebrowser.filetypes.extensions = filebrowser.filetypes.extensions || {
   '':      {fileClass: 'text', mime: 'text/plain'}, // Treat no extension files as text.
   'nfo':   {fileClass: 'text', mime: 'text/plain'},
   'txt':   {fileClass: 'text', mime: 'text/plain'},
   'vtt':   {fileClass: 'text', mime: 'text/plain'},

   'mp3':   {fileClass: 'audio', mime: 'audio/mpeg'},
   'ogg':   {fileClass: 'audio', mime: 'audio/ogg'},

   'gif':   {fileClass: 'image', mime: 'image/gif'},
   'jpeg':  {fileClass: 'image', mime: 'image/jpeg'},
   'jpg':   {fileClass: 'image', mime: 'image/jpeg'},
   'png':   {fileClass: 'image', mime: 'image/png'},
   'svg':   {fileClass: 'image', mime: 'image/svg+xml'},
   'tiff':  {fileClass: 'image', mime: 'image/tiff'},

   'pdf':   {fileClass: 'iframe', mime: 'application/pdf'},

   'html':  {fileClass: 'html', mime: 'text/html'},

   'mp4':   {fileClass: 'video', mime: 'video/mp4'},
   'm4v':   {fileClass: 'video', mime: 'video/mp4'},
   'ogv':   {fileClass: 'video', mime: 'video/ogg'},
   'ogx':   {fileClass: 'video', mime: 'video/ogg'},
   'webm':  {fileClass: 'video', mime: 'video/webm'},
   'avi':   {fileClass: 'video', mime: 'video/mp4'},
   'flv':   {fileClass: 'video', mime: 'video/mp4'},
   'mkv':   {fileClass: 'video', mime: 'video/mp4'},

   'as':    {fileClass: 'code', mime: 'text/plain'},
   'asm':   {fileClass: 'code', mime: 'text/x-asm'},
   'asp':   {fileClass: 'code', mime: 'text/asp'},
   'aspx':  {fileClass: 'code', mime: 'text/asp'},
   'c':     {fileClass: 'code', mime: 'text/x-c'},
   'coffee':{fileClass: 'code', mime: 'text/plain'},
   'cpp':   {fileClass: 'code', mime: 'text/x-c++src'},
   'cs':    {fileClass: 'code', mime: 'text/plain'},
   'css':   {fileClass: 'code', mime: 'text/css'},
   'dart':  {fileClass: 'code', mime: 'text/plain'},
   'd':     {fileClass: 'code', mime: 'text/plain'},
   'erl':   {fileClass: 'code', mime: 'text/plain'},
   'f':     {fileClass: 'code', mime: 'text/x-fortran'},
   'fs':    {fileClass: 'code', mime: 'text/plain'},
   'go':    {fileClass: 'code', mime: 'text/plain'},
   'hs':    {fileClass: 'code', mime: 'text/plain'},
   'java':  {fileClass: 'code', mime: 'text/x-java-source'},
   'js':    {fileClass: 'code', mime: 'application/x-javascript'},
   'lsp':   {fileClass: 'code', mime: 'application/x-lisp'},
   'lua':   {fileClass: 'code', mime: 'text/plain'},
   'matlab':{fileClass: 'code', mime: 'text/plain'},
   'm':     {fileClass: 'code', mime: 'text/plain'},
   'php':   {fileClass: 'code', mime: 'application/x-php'},
   'pl':    {fileClass: 'code', mime: 'text/x-script.perl'},
   'ps':    {fileClass: 'code', mime: 'text/plain'},
   'py':    {fileClass: 'code', mime: 'text/x-script.phyton'},
   'rb':    {fileClass: 'code', mime: 'application/x-ruby'},
   'r':     {fileClass: 'code', mime: 'text/plain'},
   'rkt':   {fileClass: 'code', mime: 'text/plain'},
   'rs':    {fileClass: 'code', mime: 'text/plain'},
   'sca':   {fileClass: 'code', mime: 'text/plain'},
   'sh':    {fileClass: 'code', mime: 'text/x-script.sh'},
   'swift': {fileClass: 'code', mime: 'text/plain'},
   'tex':   {fileClass: 'code', mime: 'application/x-tex'},
   'vb':    {fileClass: 'code', mime: 'text/plain'},

   'bz':    {fileClass: 'archive', mime: 'application/x-bzip'},
   'bz2':   {fileClass: 'archive', mime: 'application/x-bzip2'},
   'gz':    {fileClass: 'archive', mime: 'application/x-gzip'},
   'gzip':  {fileClass: 'archive', mime: 'application/x-gzip'},
   'rar':   {fileClass: 'archive', mime: 'application/x-rar-compressed'},
   'tar':   {fileClass: 'archive', mime: 'application/x-tar'},
   'tar.gz':{fileClass: 'archive', mime: 'application/x-gzip'},
   'tar.bz':{fileClass: 'archive', mime: 'application/x-bzip'},
   'zip':   {fileClass: 'archive', mime: 'application/x-zip'},
   '7z':    {fileClass: 'archive', mime: 'application/x-7z-compressed'},
};

filebrowser.filetypes.isFileClass = function(file, fileClass) {
   if (!filebrowser.filetypes.extensions[file.extension]) {
      return false;
   }

   return filebrowser.filetypes.extensions[file.extension].fileClass === fileClass;
}

filebrowser.filetypes.renderHTML = function(file) {
   // TODO(eriq): More error
   if (file.isDir) {
      console.log("Error: Expecting a file, got a directory.");
      return {html: ""};
   }

   var fileClass = undefined;
   if (filebrowser.filetypes.extensions[file.extension]) {
      fileClass = filebrowser.filetypes.extensions[file.extension].fileClass;
   }

   if (!filebrowser.filetypes.fileClasses[fileClass]) {
      // TODO(eriq): More error
      console.log("Error: Unknown extension: " + file.extension);
      return {html: _renderGeneral(file)};
   }

   var renderInfo = filebrowser.filetypes.fileClasses[fileClass].renderFunction(file);
   if (typeof renderInfo === 'string') {
      return {html: renderInfo};
   }

   return renderInfo;
}

// Rendering functions can return a string (the html to be rendered) or
// an object {html: '', callback: ()}.
filebrowser.filetypes.registerRenderOverride = function(fileClass, renderFunction) {
   if (!filebrowser.filetypes.fileClasses[fileClass]) {
      // TODO(eriq): Better logging
      console.log("Cannot register override, unknown fileClass: " + fileClass);
      return false;
   }

   filebrowser.filetypes.fileClasses[fileClass].renderFunction = renderFunction;

   return true;
}

filebrowser.filetypes.getFileClass = function(file) {
   if (file.isDir) {
      return 'directory';
   }

   var ext = file.ext || filebrowser.util.ext(file.name);
   if (filebrowser.filetypes.extensions[ext]) {
      return filebrowser.filetypes.extensions[ext].fileClass;
   }

   return undefined;
}

function _renderGeneralIFrame(file) {
   return filebrowser.filetypes.templates.generalIFrame
      .replace('{{RAW_URL}}', file.directLink);
}

function _renderGeneral(file) {
   return filebrowser.filetypes.templates.general
      .replace('{{FULL_NAME}}', file.name)
      .replace('{{MOD_TIME}}', filebrowser.util.formatDate(file.modDate))
      .replace('{{SIZE}}', filebrowser.util.bytesToHuman(file.size))
      .replace('{{TYPE}}', filebrowser.filetypes.getFileClass(file) || 'unknown')
      .replace('{{RAW_URL}}', file.directLink)
      .replace('{{DOWNLOAD_NAME}}', file.name)
}

function _renderAudio(file) {
   return filebrowser.filetypes.templates.audio
      .replace('{{RAW_URL}}', file.directLink)
      .replace('{{MIME}}', filebrowser.filetypes.extensions[file.extension].mime);
}

function _renderImage(file) {
   return filebrowser.filetypes.templates.image
      .replace('{{RAW_URL}}', file.directLink)
      .replace('{{BASE_NAME}}', file.basename)
      .replace('{{BASE_NAME}}', file.basename);
}

function _renderUnsupported(file) {
   return filebrowser.filetypes.templates.unsupported.replace('{{EXTENSION}}', file.extension);
}

function _renderVideo(file) {
   var poster = filebrowser.filetypes._fetchPoster(file);
   var subs = filebrowser.filetypes._fetchSubs(file);

   var subTracks = [];
   var count = 0;

   subs.forEach(function(sub) {
      var track = filebrowser.filetypes.templates.subtitleTrack;
      track = track.replace('{{SUB_LINK}}', sub.link);
      track = track.replace('{{SUB_LANG}}', sub.lang);
      track = track.replace('{{SUB_LABEL}}', sub.subId);

      subTracks.push(track);
   });

   var ext = filebrowser.util.ext(file.name);
   var mime = '';
   if (filebrowser.filetypes.extensions[ext]) {
      mime = filebrowser.filetypes.extensions[ext].mime;
   }

   var videoHTML = filebrowser.filetypes.templates.video;

   videoHTML = videoHTML.replace('{{VIDEO_LINK}}', file.extraInfo.cacheLink || file.directLink);
   videoHTML = videoHTML.replace('{{MIME_TYPE}}', mime);
   videoHTML = videoHTML.replace('{{SUB_TRACKS}}', subTracks.join());

   return {html: videoHTML, callback: filebrowser.filetypes._initVideo.bind(this, file, poster)};
}

filebrowser.filetypes._initVideo = function(file, poster) {
   if (videojs.getPlayers()['main-video-player']) {
      videojs.getPlayers()['main-video-player'].dispose();
   }

   videojs('main-video-player', {
      controls: true,
      preload: 'auto',
      poster: poster || ''
   });
}

filebrowser.filetypes._fetchSubs = function(file) {
   // List the parent and see if there are anything that looks like subs.
   // Subtitle files look like: /<base name>([_\.]<lang>)?([_\.]\d+)?.vtt/
   // We only support webvtt subs.

   var subs = [];
   var parentDir = filebrowser.cache.listingFromCache(file.parentId);

   for (var i = 0; i < parentDir.children.length; i++) {
      var child = parentDir.children[i];

      // Skip this file.
      if (child.id == file.id) {
         continue;
      }

      // Only support webvtt.
      if (child.extension != 'vtt') {
         continue;
      }

      if (!child.basename.startsWith(file.basename)) {
         continue;
      }

      var text = child.basename.replace(file.basename, '').replace(/^[\._]/, '');
      var lang = 'unknown';
      // We will fill these in later.
      var subId = '?';

      var parts = text.split(/[\._]/);

      // JS will give a single empty string if you try to split an empty string.
      if (parts.length == 1 && parts[0] == '') {
         parts.pop();
      }

      if (parts.length == 2) {
         lang = parts[0];
         subId = parts[1];
      } else if (parts.length == 1 && parts[0].match(/^\d+$/)) {
         subId = parts[0];
      } else if (parts.length == 1) {
         lang = parts[0];
      }

      subs.push({
         lang: lang,
         subId: subId,
         link: child.directLink,
      });
   }

   // Now that we have seen all the subs, fill in any missing ids.
   var nextId = subs.length;
   subs.forEach(function(sub) {
      if (sub.subId == '?') {
         sub.subId = nextId++;
      } else if (sub.subId.match(/^\d+/)) {
         sub.subId = parseInt(sub.subId, 10);
      }
   });

   subs.sort(function(a, b) {
      if (a.lang == b.lang) {
         return a.subId - b.subId;
      }

      return a.lang.localCompare(b.lang);
   });

   return subs;
}

filebrowser.filetypes._fetchPoster = function(file) {
   // List the parent and see if there are anything that looks like a poster.
   // A poster looks likes one of the following:
   //  - A file with the same basename as the video file, but an image extension.
   //  - An image with with the basename: 'poster'.

   var parentDir = filebrowser.cache.listingFromCache(file.parentId);

   var posterFile = undefined;
   for (var i = 0; i < parentDir.children.length; i++) {
      var child = parentDir.children[i];

      // Skip this file.
      if (child.id == file.id) {
         continue;
      }

      // A file with the same basename and image extension has top priority.
      if (child.basename == file.basename && filebrowser.filetypes.getFileClass(child) == 'image') {
         posterFile = child;
         break;
      }

      // If we fine "poster.*" log it, but keep looking.
      if (child.basename.toLowerCase() == 'poster' && filebrowser.filetypes.getFileClass(child) == 'image') {
         posterFile = child;
      }
   }

   if (!posterFile) {
      return '';
   }

   return posterFile.directLink;
}

// templates

filebrowser.filetypes.templates.general = `
   <div class='center'>
      <p>{{FULL_NAME}}</p>
      <p>Mod Time: {{MOD_TIME}}</p>
      <p>Size: {{SIZE}}</p>
      <p>Type: {{TYPE}}</p>
      <p><a href='{{RAW_URL}}' download='{{DOWNLOAD_NAME}}'>Direct Download</a></p>
   </div>
`;

filebrowser.filetypes.templates.generalIFrame = `
   <iframe src='{{RAW_URL}}'>
      Browser Not Supported
   </iframe>
`;

filebrowser.filetypes.templates.audio = `
   <audio controls>
      <source src='{{RAW_URL}}' type='{{MIME}}'>
      Browser Not Supported
   </audio>
`;

filebrowser.filetypes.templates.image = `
   <img class='filebrowser-image' src='{{RAW_URL}}' title='{{BASE_NAME}}' alt='{{BASE_NAME}}'>
`;

filebrowser.filetypes.templates.subtitleTrack = `
   <track kind="subtitles" src="{{SUB_LINK}}" srclang="{{SUB_LANG}}" label="{{SUB_LABEL}}"></track>
`;

filebrowser.filetypes.templates.unsupported = `
   <h2>File type ({{EXTENSION}}) is not supported.</h2>
`;

filebrowser.filetypes.templates.video = `
   <video
      id='main-video-player'
      class='video-player video-js vjs-default-skin vjs-big-play-centered'
   >
      <source src='{{VIDEO_LINK}}' type='{{MIME_TYPE}}'>

      {{SUB_TRACKS}}
      Browser not supported.
   </video>
`;
