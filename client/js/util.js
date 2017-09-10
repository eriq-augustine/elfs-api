"use strict";

var mediaserver = mediaserver || {};
mediaserver.util = mediaserver.util || {};

mediaserver.util._FRONTEND_ID_DELIM = '::';
mediaserver.util._BACKEND_PARTITION_DELIM = ':';

mediaserver.util.hashPass = function(pass, username) {
  var salted = mediaserver.util.saltPass(pass, username);
  var hash = CryptoJS.SHA256(salted).toString(CryptoJS.enc.Hex);
  return hash;
}

mediaserver.util.saltPass = function(pass, username) {
  return username + "." + pass + "." + username;
}

mediaserver.util.addTokenParam = function(link) {
   if (!mediaserver.apiToken) {
      return link;
   }

   if (!link) {
      return undefined;
   }

   var params = {
      "token": mediaserver.apiToken
   };

   return link + '?' + $.param(params);
}

mediaserver.util.getContentsPath = function(backendId, partition) {
   var params = {
      "token": mediaserver.apiToken,
      "partition": partition,
      "id": backendId
   };

   return mediaserver.apiContentsPath + '?' + $.param(params);
}

mediaserver.util.frontendId = function(backendId, partition) {
   return partition + mediaserver.util._FRONTEND_ID_DELIM + backendId;
}

// Returns [partition, backend id].
mediaserver.util.backendId = function(frontendId) {
   var parts = frontendId.split(mediaserver.util._FRONTEND_ID_DELIM);
   if (parts.length != 2) {
      console.log("Malformed id: [" + frontendId + "]");
      throw "Malformed id: [" + frontendId + "]";
   }

   return parts;
}

// Make a nice name for a partition.
// If it looks like a partition identidier (with a
// connection type and name), then just return the name,
// If it looks like an alise (no delimter), then just return that.
mediaserver.util.partitionName = function(partition) {
   var parts = partition.split(mediaserver.util._BACKEND_PARTITION_DELIM);

   // Alias.
   if (parts.length == 1) {
      return partition;
   }

   if (parts.length != 2) {
      console.log("Malformed partition: [" + partition + "]");
      throw "Malformed partition: [" + partition + "]";
   }

   return parts[1];
}
