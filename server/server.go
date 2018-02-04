package server;

import (
   "encoding/hex"
   "fmt"
   "net/http"

   "github.com/eriq-augustine/goconfig"
   "github.com/eriq-augustine/golog"

   "github.com/eriq-augustine/elfs-api/config"
   "github.com/eriq-augustine/elfs-api/api"
);

func serveFavicon(response http.ResponseWriter, request *http.Request) {
   dataBytes, err := hex.DecodeString(goconfig.GetStringDefault(config.KEY_FAVICON, ""));

   if (err != nil) {
      response.WriteHeader(http.StatusInternalServerError);
      return;
   }

   response.WriteHeader(http.StatusOK);
   response.Header().Set("Content-Type", "image/x-icon");
   response.Write(dataBytes);
}

func serveRobots(response http.ResponseWriter, request *http.Request) {
   fmt.Fprintf(response, "User-agent: *\nDisallow: /\n");
}

func redirectToHttps(response http.ResponseWriter, request *http.Request) {
   http.Redirect(response, request, fmt.Sprintf("https://%s:%d/%s", request.Host, goconfig.GetInt(config.KEY_HTTPS_PORT), request.RequestURI), http.StatusFound);
}

func BasicFileServer(urlPrefix string, baseDir string) http.Handler {
   return http.StripPrefix(urlPrefix, http.FileServer(http.Dir(baseDir)));
}

// Note that this will block until the server crashes.
func StartServer() {
   clientPrefix := "/" + goconfig.GetString(config.KEY_CLIENT_BASE_URL) + "/";

   router := api.CreateRouter(clientPrefix);

   // Attach an additional prefix for serving client files.
   http.Handle(clientPrefix, BasicFileServer(clientPrefix, goconfig.GetString(config.KEY_CLIENT_BASE_DIR)));

   http.HandleFunc("/favicon.ico", serveFavicon);
   http.HandleFunc("/robots.txt", serveRobots);

   http.Handle("/", router);

   if (goconfig.GetBool(config.KEY_USE_SSL)) {
      httpsPort := goconfig.GetInt(config.KEY_HTTPS_PORT);

      // Forward http
      if (goconfig.GetBoolDefault(config.KEY_FORWARD_HTTP, false) && goconfig.Has(config.KEY_HTTP_PORT)) {
         httpPort := goconfig.GetInt(config.KEY_HTTP_PORT);

         go func() {
            err := http.ListenAndServe(fmt.Sprintf(":%d", httpPort), http.HandlerFunc(redirectToHttps));
            if err != nil {
               golog.PanicE("Failed to redirect http to https", err);
            }
         }()
      }

      // Serve https
      golog.Info(fmt.Sprintf("Starting media server on https port %d", httpsPort));

      err := http.ListenAndServeTLS(fmt.Sprintf(":%d", httpsPort), goconfig.GetString(config.KEY_HTTPS_CERT_PATH), goconfig.GetString(config.KEY_HTTPS_KEY_PATH), nil);
      if err != nil {
         golog.PanicE("Failed to server https", err);
      }
   } else {
      port := goconfig.GetInt(config.KEY_HTTP_PORT);
      golog.Info(fmt.Sprintf("Starting media server on http port %d", port));

      err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil);
      if err != nil {
         golog.PanicE("Failed to server http", err);
      }
   }
}
