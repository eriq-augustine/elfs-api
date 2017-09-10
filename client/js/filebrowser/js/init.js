"use strict";

var filebrowser = filebrowser || {};
filebrowser.initFields = filebrowser.initFields || {};

filebrowser.initFields._containerTemplate = `
   <div class='filebrowser-head-area'>
      <div class='filebrowser-head-content'>
         <div class='filebrowser-breadcrumbs-area'>
         </div>
         <div class='filebrowser-context-actions-area'>
         </div>
      </div>
   </div>
   <div class='filebrowser-body-area'>
      <div class='filebrowser-body-content'>
      </div>
   </div>
`

/*
   options: {
      renderOverrides: {
         fileClass: func(file)
      }
   }
*/
// Init is an async operation.
// Pass a callback to be notified when it is ready.
// |fetchFunction| should look like: function(direntId, function(direntsFetched, parentIdOfDirents)).
// |directLinkFunction| gets a direct link (file contents) of a file (filebrowser.File),
//  It should look like: function(file).
//  If a file does not already have a directLink field populated, then this function will be called.
filebrowser.init = function(containerId, fetchFunction, directLinkFunction, options, callback) {
   options = options || {};

   filebrowser.customFetch = fetchFunction;
   filebrowser.prepareDirectLink = directLinkFunction;

   filebrowser.containerId = containerId;
   filebrowser.tableId = containerId + '-tablesorter';

   filebrowser.containerQuery = '#' + filebrowser.containerId;
   filebrowser.bodyContentQuery = filebrowser.containerQuery + ' .filebrowser-body-content';
   filebrowser.tableQuery = '#' + filebrowser.tableId;
   filebrowser.breadcrumbQuery = filebrowser.containerQuery + ' .filebrowser-breadcrumbs-area';
   filebrowser.contextActionsQuery = filebrowser.containerQuery + ' .filebrowser-context-actions-area';

   filebrowser.initFields._parseOptions(options);
   filebrowser.initFields._initHTML(options);
   filebrowser.initFields._initTablesorter();

   // Initialing the cache is an async operation.
   filebrowser.cache._init(function() {
      if (callback) {
         callback();
      }
   });
}

filebrowser.initFields._initHTML = function() {
   $(filebrowser.containerQuery).addClass('filebrowser-container').html(filebrowser.initFields._containerTemplate);
}

filebrowser.initFields._parseOptions = function(options) {
   if (options.hasOwnProperty('renderOverrides')) {
      for (var fileClass in options.renderOverrides) {
         if(options.renderOverrides.hasOwnProperty(fileClass)) {
            filebrowser.filetypes.registerRenderOverride(fileClass, options.renderOverrides[fileClass]);
         }
      }
   }
}

filebrowser.initFields._initTablesorter = function() {
   $.tablesorter.addParser({
      id: 'fileSize',
      is: function(s) { // return false so this parser is not auto detected
         return false;
      },
      format: function(data) {
         // Convert the data to bytes for sorting.
         return filebrowser.util.humanToBytes(data);
      },
      type: 'numeric'
   });

   $.tablesorter.addParser({
      id: 'fileName',
      is: function(s) { // return false so this parser is not auto detected
         return false;
      },
      format: function(data) {
         return data;
      },
      type: 'text'
   });
}
