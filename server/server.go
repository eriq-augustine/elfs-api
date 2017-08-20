package server;

import (
   "encoding/hex"
   "flag"
   "fmt"
   "net/http"

   "github.com/eriq-augustine/goconfig"
   "github.com/eriq-augustine/golog"

   "github.com/eriq-augustine/elfs-api/api"
);

const (
   DEFAULT_BASE_CONFIG_PATH = "config/config.json"
   DEFAULT_FILETYPES_CONFIG_PATH = "config/filetypes.json"
)

// Flags
var (
   configPath = flag.String("config", DEFAULT_BASE_CONFIG_PATH, "Path to the configuration file to use")
   prod = flag.Bool("prod", false, "Use prodution configuration")
)

func serveFavicon(response http.ResponseWriter, request *http.Request) {
   dataBytes, err := hex.DecodeString(goconfig.GetStringDefault("favicon", ""));

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
   http.Redirect(response, request, fmt.Sprintf("https://%s:%d/%s", request.Host, goconfig.GetInt("httpsPort"), request.RequestURI), http.StatusFound);
}

func BasicFileServer(urlPrefix string, baseDir string) http.Handler {
   return http.StripPrefix(urlPrefix, http.FileServer(http.Dir(baseDir)));
}

// Note that this will block until the server crashes.
func StartServer() {
   clientPrefix := "/" + goconfig.GetString("clientBaseURL") + "/";

   router := api.CreateRouter(clientPrefix);

   // Attach an additional prefix for serving client files.
   http.Handle(clientPrefix, BasicFileServer(clientPrefix, goconfig.GetString("clientBaseDir")));

   http.HandleFunc("/favicon.ico", serveFavicon);
   http.HandleFunc("/robots.txt", serveRobots);

   http.Handle("/", router);

   if (goconfig.GetBool("useSSL")) {
      httpsPort := goconfig.GetInt("httpsPort");

      // Forward http
      if (goconfig.GetBoolDefault("forwardHttp", false) && goconfig.Has("httpPort")) {
         httpPort := goconfig.GetInt("httpPort");

         go func() {
            err := http.ListenAndServe(fmt.Sprintf(":%d", httpPort), http.HandlerFunc(redirectToHttps));
            if err != nil {
               golog.PanicE("Failed to redirect http to https", err);
            }
         }()
      }

      // Serve https
      golog.Info(fmt.Sprintf("Starting media server on https port %d", httpsPort));

      err := http.ListenAndServeTLS(fmt.Sprintf(":%d", httpsPort), goconfig.GetString("httpsCertFile"), goconfig.GetString("httpsKeyFile"), nil);
      if err != nil {
         golog.PanicE("Failed to server https", err);
      }
   } else {
      port := goconfig.GetInt("httpPort");
      golog.Info(fmt.Sprintf("Starting media server on http port %d", port));

      err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil);
      if err != nil {
         golog.PanicE("Failed to server http", err);
      }
   }
}

func LoadConfig() {
   flag.Parse();

   goconfig.LoadFile(*configPath);

   if (*prod) {
      golog.SetDebug(false);

      if (goconfig.Has("prodConfig")) {
         goconfig.LoadFile(goconfig.GetString("prodConfig"));
      }
   } else {
      golog.SetDebug(true);
   }
}
