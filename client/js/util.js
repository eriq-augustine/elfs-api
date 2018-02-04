"use strict";

var mediaserver = mediaserver || {};
mediaserver.util = mediaserver.util || {};

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

mediaserver.util.getContentsPath = function(backendId) {
   var params = {
      "token": mediaserver.apiToken,
      "id": backendId
   };

   return mediaserver.apiContentsPath + '?' + $.param(params);
}
