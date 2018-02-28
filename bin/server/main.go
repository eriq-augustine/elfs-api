package main;

import (
   "encoding/hex"
   "fmt"
   "os"
   "os/signal"
   "syscall"

   "github.com/eriq-augustine/goconfig"
   "github.com/eriq-augustine/golog"
   "github.com/spf13/pflag"

   "github.com/eriq-augustine/elfs-api/config"
   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/server"
);

// Flags
var (
   configPath = pflag.StringP("config", "c", config.DEFAULT_BASE_CONFIG_PATH, "Path to the configuration file to use");
   prod = pflag.BoolP("prod", "p", false, "Use prodution configuration");
   connectionString = pflag.StringP("connection-string", "s", "", "Connection string for the target filesystem.");
   hexKey = pflag.StringP("key", "k", "", "Key for the filesystem.");
   hexIV = pflag.StringP("iv", "i", "", "IV for the filesystem.");
   force = pflag.BoolP("force", "f", false, "Force the filesystem to mount regardless of locks.");
)

func main() {
   key, iv := loadConfig();

   err := fsdriver.LoadDriver(*connectionString, key, iv, *force);
   if (err != nil) {
      golog.PanicE(fmt.Sprintf("Could not load driver for: [%s].", *connectionString), err);
   }

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

func loadConfig() ([]byte, []byte) {
   pflag.Parse();

   goconfig.LoadFile(*configPath);

   if (*prod) {
      golog.SetDebug(false);

      if (goconfig.Has(config.KEY_PROD_CONFIG_PATH)) {
         goconfig.LoadFile(goconfig.GetString(config.KEY_PROD_CONFIG_PATH));
      }
   } else {
      golog.SetDebug(true);
   }

   // If we didn't get connection information on the command line, check the config.
   if (*connectionString == "") {
      if (!goconfig.Has(config.KEY_CONNECTION_STRING)) {
         golog.Panic("No connection string found on the command line or config.");
      }
      *connectionString = goconfig.GetString(config.KEY_CONNECTION_STRING);
   }

   if (*hexKey == "") {
      if (!goconfig.Has(config.KEY_KEY)) {
         golog.Panic("No key found on the command line or config.");
      }

      golog.Warn("Key found in config." +
            " Keeping keys in plain text on disk can be dangrous." +
            " It is suggested to keep them in an environment variable and pass on the command line.");
      *hexKey = goconfig.GetString(config.KEY_KEY);
   }

   if (*hexIV == "") {
      if (!goconfig.Has(config.KEY_IV)) {
         golog.Panic("No IV found on the command line or config.");
      }

      golog.Warn("IV found in config." +
            " Keeping IVs in plain text on disk can be dangrous." +
            " It is suggested to keep them in an environment variable and pass on the command line.");
      *hexIV = goconfig.GetString(config.KEY_IV);
   }

   // Convert the key and IV from hex.
   key, err := hex.DecodeString(*hexKey);
   if (err != nil) {
      golog.PanicE("Could not decode hex key.", err);
   }

   iv, err := hex.DecodeString(*hexIV);
   if (err != nil) {
      golog.PanicE("Could not decode hex IV.", err);
   }

   return key, iv;
}

// Cleanup for shutting down the server.
func cleanup() {
   fsdriver.CloseDriver();
}
