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

mediaserver.util.getContentsPath = function(dirent) {
   var params = {
      "token": mediaserver.apiToken,
      // TODO(eriq): get actual partition.
      "partition": 'local:/home/eriq/code/elfs/testtime',
      "id": dirent.Id
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

mediaserver.util.partitionName = function(partition) {
   var parts = partition.split(mediaserver.util._BACKEND_PARTITION_DELIM);
   if (parts.length != 2) {
      console.log("Malformed partition: [" + partition + "]");
      throw "Malformed partition: [" + partition + "]";
   }

   return parts[1];
}
