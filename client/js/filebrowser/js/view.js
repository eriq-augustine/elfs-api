"use strict";

var filebrowser = filebrowser || {};
filebrowser.view = filebrowser.view || {};

filebrowser.view._BROWSER_MODE_LISTING = 'listing';
filebrowser.view._BROWSER_MODE_ICON_VIEW = 'icon';

filebrowser.view._viewModes = {
   listing: {renderFunction: _loadTableView, icon: 'list', tooltip: 'List View'},
   icon: {renderFunction: _loadIconView, icon: 'th', tooltip: 'Icon View'},
   gallery: {renderFunction: _loadGalleryView, icon: 'picture-o', tooltip: 'Gallery View'},
};

filebrowser.view._browserMode = 'listing';

filebrowser.view._arrayToTableRow = function(data, isHeader) {
   isHeader = isHeader | false;
   var cellType = isHeader ? 'th' : 'td';

   var tr = document.createElement('tr');

   data.forEach(function(dataObject) {
      var td = document.createElement(cellType);

      if (typeof dataObject === 'object' && dataObject instanceof HTMLElement) {
         td.appendChild(dataObject);
      } else {
         var textElement = document.createElement('span');
         textElement.textContent = dataObject;
         td.appendChild(textElement);
      }

      tr.appendChild(td);
   });

   return tr;
}

filebrowser.view._getFileIcon = function(listing) {
   var icon = 'file-o';
   if (listing.isDir) {
      icon = 'folder-o'
   } else {
      var classInfo = filebrowser.filetypes.fileClasses[filebrowser.filetypes.getFileClass(listing)];
      classInfo = classInfo || filebrowser.filetypes.fileClasses['general'];

      var icon = classInfo.icon || 'file-o';
   }

   return icon;
}

filebrowser.view._generateFileLabel = function(listing) {
   var icon = filebrowser.view._getFileIcon(listing);
   var iconElement = document.createElement('i');
   iconElement.className = 'fa fa-fw fa-' + icon;

   var labelElement = document.createElement('span');
   labelElement.appendChild(document.createTextNode(listing.name));

   var labelContainer = document.createElement('a');
   labelContainer.className = 'filebrowser-label-container';
   labelContainer.setAttribute('href', '#' + filebrowser.nav.encodeForHash(listing.id));
   labelContainer.appendChild(iconElement);
   labelContainer.appendChild(labelElement);

   return labelContainer;
}

filebrowser.view_fileToTableRow = function(file) {
   var typeName = filebrowser.filetypes.getFileClass(file) || 'unknown';
   var data = [
      filebrowser.view._generateFileLabel(file),
      filebrowser.util.formatDate(file.modDate),
      typeName,
      filebrowser.util.bytesToHuman(file.size)
   ];

   return filebrowser.view._arrayToTableRow(data, false);
}

filebrowser.view._filesToTable = function(files) {
   var table = document.createElement('table');

   var tableHead = document.createElement('thead');
   var headerData = ['Name', 'Date', 'Type', 'Size'];
   tableHead.appendChild(filebrowser.view._arrayToTableRow(headerData, true));
   table.appendChild(tableHead);

   var tableBody = document.createElement('tbody');
   files.forEach(function(file) {
      var row = filebrowser.view_fileToTableRow(file);
      row.setAttribute('data-path', file.id);
      tableBody.appendChild(row);
   });
   table.appendChild(tableBody);

   return table;
}

filebrowser.view.clearContent = function() {
   $(filebrowser.bodyContentQuery).empty();
}

filebrowser.view.loadViewer = function(file) {
   filebrowser.view.clearContent();

   var renderInfo = filebrowser.filetypes.renderHTML(file);

   $(filebrowser.bodyContentQuery).html(renderInfo.html);

   if (renderInfo.callback) {
      renderInfo.callback();
   }
}

filebrowser.view._changeView = function(viewMode, listing, children) {
   if (viewMode == filebrowser.view._browserMode) {
      return;
   }

   filebrowser.view._browserMode = viewMode;
   filebrowser.view.loadBrowserContent(listing, children);
   filebrowser.view.loadContextActions(listing, children);
}

filebrowser.view.loadBrowserContent = function(listing, children) {
   if (!filebrowser.view._viewModes.hasOwnProperty(filebrowser.view._browserMode)) {
      // TODO(eriq): More logging.
      console.log('Error: unknown browser mode: ' + filebrowser.view._browserMode + ', falling back to listing');
      filebrowser.view._browserMode = 'listing';
   }

   filebrowser.view._viewModes[filebrowser.view._browserMode].renderFunction(listing, children);
}

filebrowser.view._loadGalleryView = _loadGalleryView;
function _loadGalleryView(listing, children) {
   var data = [];

   var gallery = document.createElement('div');
   gallery.className = 'galleria';

   Galleria.configure({
      autoplay: false,
      clicknext: true,
      preload: 10,
      transitionSpeed: 100,
   });

   // Make sure that there are images here.
   // If not, bail out to listing view.
   var hasImage = false;

   children.sort(function(a, b) {return a.name.localeCompare(b.name);}).forEach(function(child) {
      if (!filebrowser.filetypes.isFileClass(child, 'image')) {
         return;
      }
      hasImage = true;

      data.push({
         image: child.directLink,
         title: child.name,
      });
   });

   if (!hasImage) {
      filebrowser.view._changeView('listing', listing, children);
      return;
   }

   filebrowser.view.clearContent();
   $(filebrowser.bodyContentQuery).append(gallery);

   Galleria.run('.galleria', {
      dataSource: data
   });
}

filebrowser.view._loadIconView = _loadIconView;
function _loadIconView(listing, children) {
   var iconBoard = document.createElement('div');
   iconBoard.className = 'filebrowser-icon-board';

   children.sort(function(a, b) {return a.name.localeCompare(b.name);}).forEach(function(child) {
      var url = filebrowser.util.joinURL(listing.id, child.name);

      var listingElement = document.createElement('div');
      listingElement.className = 'filebrowser-icon-listing';
      listingElement.appendChild(filebrowser.view._generateFileLabel(child));
      listingElement.addEventListener('click', filebrowser.nav.changeTarget.bind(window, url));

      iconBoard.appendChild(listingElement);
   });

   filebrowser.view.clearContent();
   $(filebrowser.bodyContentQuery).append(iconBoard);
}

filebrowser.view._loadTableView = _loadTableView;
function _loadTableView(listing, children) {
   var table = filebrowser.view._filesToTable(children);
   table.id = filebrowser.tableId;
   table.className = 'tablesorter';

   filebrowser.view.clearContent();
   $(filebrowser.bodyContentQuery).append(table);

   $(filebrowser.tableQuery).tablesorter({
      sortList: [[0, 0]],
      widgets: ['zebra'],
      headers: {
         0: {
            sorter: 'fileName'
         },
         3: {
            sorter: 'fileSize'
         }
      },
   });
}

// |breadcrumbs| should be [{display: '', id: ''}, ...].
filebrowser.view.loadBreadcrumbs = function(breadcrumbs) {
   var breadcrumbsElement = document.createElement('div');
   breadcrumbsElement.className = 'filebrowser-breadcrumbs';

   breadcrumbs.forEach(function(breadcrumb, index) {
      var breadcrumbElement = document.createElement('div');
      breadcrumbElement.className = 'filebrowser-breadcrumb';

      var breadcrumbTextElement;

      // Don't register a handler for the last element (we are already there).
      if (index == breadcrumbs.length - 1) {
         breadcrumbTextElement = document.createElement('span');
         breadcrumbTextElement.textContent = breadcrumb.display;
         breadcrumbTextElement.className = 'filebrowser-breadcrumb-element';
      } else {
         breadcrumbTextElement = document.createElement('a');
         breadcrumbTextElement.textContent = breadcrumb.display;
         breadcrumbTextElement.className = 'filebrowser-breadcrumb-element';
         breadcrumbTextElement.setAttribute('href', '#' + filebrowser.nav.encodeForHash(breadcrumb.id));
      }

      breadcrumbElement.appendChild(breadcrumbTextElement);
      breadcrumbsElement.appendChild(breadcrumbElement);

      // Don't put a separator after the first or last element.
      // (First element it root).
      if (index != 0 && index != breadcrumbs.length - 1) {
         var separator = document.createElement('span');
         separator.className = 'filebrowser-breadcrumb-separator';
         separator.textContent = '/';
         breadcrumbsElement.appendChild(separator);
      }
   });

   $(filebrowser.breadcrumbQuery).empty();
   $(filebrowser.breadcrumbQuery).append(breadcrumbsElement);
}

filebrowser.view.loadContextActions = function(listing, children) {
   $(filebrowser.contextActionsQuery).empty();

   if (!listing.isDir) {
      // Files gets a direct download link.
      var downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', listing.directLink);
      downloadLink.setAttribute('download', listing.name);

      var downloadIcon = document.createElement('i');
      downloadIcon.className = 'fa fa-download';
      downloadIcon.setAttribute('data-toggle', 'tooltip');
      downloadIcon.setAttribute('title', 'Download');

      downloadLink.appendChild(downloadIcon);
      $(filebrowser.contextActionsQuery).append(downloadLink);
   } else {
      // Dirs get to choose between icon and list view.

      var hasImage = false;
      children.forEach(function(child) {
         if (filebrowser.filetypes.isFileClass(child, 'image')) {
            hasImage = true;
         }
      });

      for (var viewMode in filebrowser.view._viewModes) {
         if (!filebrowser.view._viewModes.hasOwnProperty(viewMode)) {
            continue;
         }

         // Don't show an option for the current mode.
         if (viewMode == filebrowser.view._browserMode) {
            continue;
         }

         // Only show gallery if there is an image present.
         if (viewMode == 'gallery' && !hasImage) {
            continue;
         }

         var viewInfo = filebrowser.view._viewModes[viewMode];

         var switchView = document.createElement('i');
         switchView.className = 'fa fa-' + viewInfo.icon;
         switchView.setAttribute('data-toggle', 'tooltip');
         switchView.setAttribute('title', viewInfo.tooltip);
         switchView.addEventListener('click', filebrowser.view._changeView.bind(window, viewMode, listing, children));

         $(filebrowser.contextActionsQuery).append(switchView);
      }
   }
}
