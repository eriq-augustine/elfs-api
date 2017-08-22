package main;

import (
   "os"
   "os/signal"
   "syscall"

   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/server"
);

func main() {
   server.LoadConfig();

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

// Cleanup for shutting down the server.
func cleanup() {
   fsdriver.CloseDrivers();
}
