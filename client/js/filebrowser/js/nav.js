"use strict";

var filebrowser = filebrowser || {};
filebrowser.nav = filebrowser.nav || {};

// Start with nothing.
// The hash will be examined before we actually start to override with a location or root.
// Only updateCurrentTarget() is allowed to modify this.
filebrowser.nav._currentTarget = filebrowser.nav._currentTarget || '';
filebrowser.nav._history = filebrowser.nav._history || [];

window.addEventListener("hashchange", function(newValue) {
   if (filebrowser.nav.getCurrentTargetPath() != filebrowser.nav.cleanHashPath()) {
      filebrowser.nav.changeTarget(filebrowser.nav.cleanHashPath());
   }
});

filebrowser.nav.changeTarget = function(id, force) {
   // Do nothing if we are already pointing to the target.
   // Be careful that we don't block the first load.
   if (!force && filebrowser.nav.getCurrentTargetPath() == id) {
      return;
   }

   var listing = filebrowser.cache.listingFromCache(id);
   if (!listing) {
      filebrowser.cache.loadCache(id, filebrowser.nav.changeTarget.bind(window, id, force));
      return;
   }

   if (listing.isDir) {
      filebrowser.view.loadBrowserContent(listing, listing.children, id);
   } else if (listing.isExtractedArchive) {
      filebrowser.view.loadBrowserContent(listing, listing.archiveChildren, id);
   } else {
      filebrowser.view.loadViewer(listing, id);
   }

   // Update the current target.
   filebrowser.nav._updateCurrentTarget(id, listing);
}

filebrowser.nav.getCurrentTargetPath = function() {
   return filebrowser.nav._currentTarget;
}

// This is the only function allowed to modify |_currentTarget|.
filebrowser.nav._updateCurrentTarget = function(id, listing) {
   filebrowser.nav._currentTarget = id;

   // Update the history.
   filebrowser.nav._history.push(id);

   // Change the hash if necessary.
   if (id != filebrowser.nav.cleanHashPath()) {
      window.location.hash = filebrowser.nav.encodeForHash(id);
   }

   // Change the page's title.
   document.title = listing.name;

   // Update the breadcrumbs.
   filebrowser.view.loadBreadcrumbs(filebrowser.nav._buildBreadcrumbs(listing));

   // Update any context actions.
   filebrowser.view.loadContextActions(listing, id);
}

// Go through all the parents and build up some breadcrumbs.
filebrowser.nav._buildBreadcrumbs = function(listing) {
   var breadcrumbs = [];

   while (true) {
      breadcrumbs.unshift({display: listing.name, id: listing.id});

      // Root it its own parent.
      if (!listing.parentId || listing.parentId == listing.id) {
         break;
      }
      listing = filebrowser.cache.listingFromCache(listing.parentId);
   }

   // Make sure to add in root.
   breadcrumbs.unshift({display: '/', id: ''});

   return breadcrumbs;
}

// Encode an id for use in a hash.
// We could just do a full encodeURIComponent(), but we can handle leaving
// slashes and spaces alone. This increases readability of the URL.
filebrowser.nav.encodeForHash = function(id) {
   var encodePath = encodeURIComponent(id);

   // Unreplace the slash (%2F), space (%20), and colon (%3A).
   return encodePath.replace(/%2F/g, '/').replace(/%20/g, ' ').replace(/%3A/g, ':');
}

// Remove the leading hash and decode the id
filebrowser.nav.cleanHashPath = function() {
   return decodeURIComponent(window.location.hash.replace(/^#/, ''));
}
