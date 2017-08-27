"use strict";

var mediaserver = mediaserver || {};

// Convert a backend DirEntry to a frontend DirEnt.
mediaserver._convertBackendDirEntry = function(dirEntry) {
   // TEST
   console.log(dirEntry);

   if (dirEntry.IsFile) {
      return new filebrowser.File(dirEntry.Id, dirEntry.Name, new Date(dirEntry.ModTimestamp),
            dirEntry.Size, mediaserver.util.getContentsPath(dirEntry));
   } else {
      return new filebrowser.Dir(dirEntry.Id, dirEntry.Name, new Date(dirEntry.ModTimestamp));
   }
}

mediaserver._fetch = function(id, callback) {
   id = id || '';

   var params = {
      "id": id,
      // TODO(eriq): get actual partition.
      "partition": 'local:/home/eriq/code/elfs/testtime'
   };
   var url = mediaserver.apiBrowserPath + '?' + $.param(params);

   $.ajax(url, {
      dataType: 'json',
      headers: {'Authorization': mediaserver.apiToken},
      error: function(request, textStatus, error) {
         // Permission denied.
         if (request.status == 401) {
            alert('Need to login again.');
            // TODO(eriq): function
            mediaserver.apiToken = undefined;
            mediaserver.store.unset(mediaserver.store.TOKEN_KEY);
            mediaserver._setupLogin();
            return;
         }

         // TODO(eriq): log?
         console.log("Error getting data");
         console.log(request);
         console.log(textStatus);
      },
      success: function(data) {
         // TEST
         console.log(data);

         if (!data.Success) {
            // TODO(eriq): more
            console.log("Unable to get listing");
            console.log(data);
            return;
         }

         var rtnData;
         if (data.IsDir) {
            rtnData = mediaserver._convertBackendDirEntry(data.DirEntry);

            // Fill in the children.
            var children = [];
            data.Children.forEach(function(child) {
               children.push(mediaserver._convertBackendDirEntry(child));
            });

            rtnData.children = children;
         } else {
            rtnData = mediaserver._convertBackendDirEntry(data.DirEntry);
         }

         callback(!data.IsFile, rtnData);
      }
   });
}

mediaserver.videoTemplate = `
   <video
      id='main-video-player'
      class='video-player video-js vjs-default-skin vjs-big-play-centered'
   >
      <source src='{{VIDEO_LINK}}' type='{{MIME_TYPE}}'>

      {{SUB_TRACKS}}
      Browser not supported.
   </video>
`;

mediaserver.subtitleTrackTemplate = `
   <track kind="subtitles" src="{{SUB_LINK}}" srclang="{{SUB_LANG}}" label="{{SUB_LABEL}}"></track>
`;

mediaserver._fetchSubs = function(file) {
   // List the parent and see if there are anything that looks like subs.

   // TODO(eriq).
   return [];
}

mediaserver._fetchPoster = function(file) {
   // List the parent and see if there are anything that looks like a poster.

   // TODO(eriq).
   return '';
}

mediaserver._renderVideo = function(file) {
   poster = mediaserver._fetchPoster(file);
   subs = mediaserver._fetchSubs(file);

   var subTracks = [];
   var count = 0;

   subs.forEach(function(sub) {
      var track = mediaserver.subtitleTrackTemplate;
      track = track.replace('{{SUB_LINK}}', sub);

      // TODO(eriq): Figure out how to get lang.
      track = track.replace('{{SUB_LANG}}', 'unknown');
      track = track.replace('{{SUB_LABEL}}', "" + count++);

      subTracks.push(track);
   });

   var ext = filebrowser.util.ext(file.name);
   var mime = '';
   if (filebrowser.filetypes.extensions[ext]) {
      mime = filebrowser.filetypes.extensions[ext].mime;
   }

   var videoHTML = mediaserver.videoTemplate;

   videoHTML = videoHTML.replace('{{VIDEO_LINK}}', file.extraInfo.cacheLink || file.directLink);
   videoHTML = videoHTML.replace('{{MIME_TYPE}}', mime);
   videoHTML = videoHTML.replace('{{SUB_TRACKS}}', subTracks.join());

   return {html: videoHTML, callback: mediaserver._initVideo.bind(this, file, poster)};
}

mediaserver._initVideo = function(file) {
   if (videojs.getPlayers()['main-video-player']) {
      videojs.getPlayers()['main-video-player'].dispose();
   }

   videojs('main-video-player', {
      controls: true,
      preload: 'auto',
      poster: poster || ''
   });
}
