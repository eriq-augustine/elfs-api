"use strict";

var mediaserver = mediaserver || {};

mediaserver.apiPath = '/api/v00';
mediaserver.apiBrowserPath = mediaserver.apiPath + '/browse';
mediaserver.apiContentsPath = mediaserver.apiPath + '/contents';
mediaserver.apiLoginPath = mediaserver.apiPath + '/auth/token/request';

mediaserver.apiToken = undefined;

mediaserver._contentTemplate = `
   <div id='mediaserver-filebrowser' class='filebrowser-container'>
   </div>
`

mediaserver._loginTemplate = `
   <div class='login-area'>
      <h2>Login</h2>
      <form action='javascript:mediaserver.login()'>
         <input type='text' name='username' placeholder='username' autofocus>
         <input type='password' name='password' placeholder='password'>
         <input type='submit' value='Login'>
      </form>
   </div>
`

mediaserver._init = function() {
   $('.content').empty().append(mediaserver._contentTemplate);

   // Init the file browser.
   // TODO(eriq): Make the video default.
   var options = {
      renderOverrides: {
         video: mediaserver._renderVideo
      }
   };
   filebrowser.init('mediaserver-filebrowser', mediaserver._fetch, options);

   // If there is a valid hash path, follow it.
   // Otherwise, set up a new hash at root.
   var target = '';
   if (window.location.hash) {
      target = filebrowser.nav.cleanHashPath();
   }

   filebrowser.nav.changeTarget(target, 0, true);
}

mediaserver._setupLogin = function() {
   $('.content').empty().append(mediaserver._loginTemplate);
}

mediaserver.login = function() {
   var username = $('.login-area input[name=username]').val();
   var password = $('.login-area input[name=password]').val();

   if (!username || !password) {
      alert('Need both username and password.');
      return;
   }

   var passhash = mediaserver.util.hashPass(password, username);

   var params = {
      "username": username,
      "passhash": passhash
   };
   var url = mediaserver.apiLoginPath + '?' + $.param(params);

   $.ajax(url, {
      dataType: 'json',
      error: function(request, textStatus, error) {
         // Permission denied.
         if (request.status == 403) {
            alert('Bad username/password combination.');
            return;
         }

         // TODO(eriq): log?
         console.log("Error getting login");
         console.log(request);
         console.log(textStatus);
         alert('Some server error occured.');
      },
      success: function(data) {
         if (!data.Success) {
            // TODO(eriq): more
            console.log("Unable to get token");
            console.log(data);
            return;
         }

         mediaserver.apiToken = data.Token;
         mediaserver.store.set(mediaserver.store.TOKEN_KEY, mediaserver.apiToken);
         mediaserver._init();
      }
   });
}

$(document).ready(function() {
   if (mediaserver.store.has(mediaserver.store.TOKEN_KEY)) {
      mediaserver.apiToken = mediaserver.store.get(mediaserver.store.TOKEN_KEY);
   }

   if (mediaserver.apiToken) {
      mediaserver._init();
   } else {
      mediaserver._setupLogin();
   }
});
