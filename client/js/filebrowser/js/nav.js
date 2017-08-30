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

   var listing = filebrowser.cache.listingFromCache(id, true);
   if (!listing) {
      filebrowser.cache.loadCache(id, filebrowser.nav.changeTarget.bind(window, id, force));
      return;
   }

   // If this is a dir, load up the children for nav context.
   var children = undefined;

   // Both dirs and extracted archives are treated the same.
   if (listing.isDir || listing.isExtractedArchive) {
      var childIds = undefined;
      if (listing.isDir) {
         childIds = listing.children;
      } else {
         childIds = listing.archiveChildren;
      }

      // Fetch all the children.
      // We are only doing shallow fetches, and they should all already be cached.
      var children = [];
      childIds.forEach(function(childId) {
         children.push(filebrowser.cache.listingFromCache(childId));
      });

      filebrowser.view.loadBrowserContent(listing, children);
   } else {
      filebrowser.view.loadViewer(listing);
   }

   // Update the current target.
   filebrowser.nav._updateCurrentTarget(listing, children);
}

filebrowser.nav.getCurrentTargetPath = function() {
   return filebrowser.nav._currentTarget;
}

// This is the only function allowed to modify |_currentTarget|.
filebrowser.nav._updateCurrentTarget = function(listing, children) {
   filebrowser.nav._currentTarget = listing.id;

   // Update the history.
   filebrowser.nav._history.push(listing.id);

   // Change the hash if necessary.
   if (listing.id != filebrowser.nav.cleanHashPath()) {
      window.location.hash = filebrowser.nav.encodeForHash(listing.id);
   }

   // Change the page's title.
   document.title = listing.name;

   // Update the breadcrumbs.
   filebrowser.view.loadBreadcrumbs(filebrowser.nav._buildBreadcrumbs(listing));

   // Update any context actions.
   filebrowser.view.loadContextActions(listing, children);
}

// Go through all the parents and build up some breadcrumbs.
filebrowser.nav._buildBreadcrumbs = function(listing) {
   var breadcrumbs = [];

   // Stop at root (root it its own parent).
   while (listing.parentId != listing.id) {
      breadcrumbs.unshift({display: listing.name, id: listing.id});
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
