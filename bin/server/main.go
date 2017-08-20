package main;

import (
   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/server"
);

func main() {
   server.LoadConfig();

   // It is safe to load users after the configs have been loaded.
   auth.LoadUsers();

   server.StartServer();
}
