package main;

import (
   "flag"
   "os"
   "os/signal"
   "syscall"

   "github.com/eriq-augustine/goconfig"
   "github.com/eriq-augustine/golog"

   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/server"
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

func main() {
   loadConfig();

   // It is safe to load users after the configs have been loaded.
   auth.LoadUsers();

   // Gracefully handle SIGINT and SIGTERM.
   sigChan := make(chan os.Signal, 1);
   signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM);

   go func() {
      <-sigChan;
      cleanup();
      os.Exit(0);
   }();

   server.StartServer();

   // Should never actually be reached.
   cleanup();
}

func loadConfig() {
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

// Cleanup for shutting down the server.
func cleanup() {
   fsdriver.CloseDrivers();
}
