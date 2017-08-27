"use strict";

var mediaserver = mediaserver || {};
mediaserver.store = mediaserver.store || {};

mediaserver.store._backend = window.localStorage;

mediaserver.store._PREFIX = 'elfs';
mediaserver.store.TOKEN_KEY = 'api-token';

mediaserver.store.set = function(key, val) {
   key = mediaserver.store._prefixKey(key);
   if ((typeof val) == 'string') {
      mediaserver.store._backend[key] = val;
   } else {
      mediaserver.store._backend[key] = JSON.stringify(val);
   }
}

mediaserver.store.has = function(key) {
   key = mediaserver.store._prefixKey(key);
   return mediaserver.store._has(key);
}

// Internally, we assume the key has already been prefixed.
mediaserver.store._has = function(key) {
   return mediaserver.store._backend.hasOwnProperty(key);
}

mediaserver.store.get = function(key, defaultValue) {
   key = mediaserver.store._prefixKey(key);

   if (!mediaserver.store._has(key)) {
      return defaultValue;
   }

   return mediaserver.store._backend[key];
}

mediaserver.store.getObject = function(key, defaultValue) {
   key = mediaserver.store._prefixKey(key);

   if (!mediaserver.store._has(key)) {
      return defaultValue;
   }

   return JSON.parse(mediaserver.store._backend[key]);
}

mediaserver.store.unset = function(key) {
   key = mediaserver.store._prefixKey(key);

   if (mediaserver.store.has(key)) {
      delete mediaserver.store._backend[key];
   }
}

mediaserver.store._prefixKey = function(key) {
   return mediaserver.store._PREFIX + "_" + key;
}
