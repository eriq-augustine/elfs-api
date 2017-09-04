package main;

import (
   "bufio"
   "encoding/hex"
   "fmt"
   "os"

   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/util"
);

var reader *bufio.Reader = bufio.NewReader(os.Stdin);

func showUsage() {
   fmt.Println("Manage a public partitions file.\n");
   fmt.Printf("usage: %s <action> <partition file>\n\n", os.Args[0]);
   fmt.Println("Options:");
   fmt.Println("   list (ls)               - list the current public partitions");
   fmt.Println("   add (a)                 - add a public partition (will create the file if it does not exist)");
   fmt.Println("   remove (rm)             - remove a public partition");
   fmt.Println("   help (h)                - print this message and exit");
}

func getCredentials() (string, string) {
   fmt.Print("Key: ");
   hexKey := util.ReadPassword(reader);

   fmt.Print("IV: ");
   hexIV := util.ReadPassword(reader);

   return hexKey, hexIV;
}

func getPartitions(path string) (string, string, map[string]fsdriver.PartitionCredentials) {
   if (!util.PathExists(path)) {
      fmt.Printf("Partitions file (%s) does not exist.\n", path);
      os.Exit(1);
   }

   hexKey, hexIV := getCredentials();

   partitions, err := fsdriver.LoadPublicPartitionsFile(path, hexKey, hexIV);
   if (err != nil) {
      fmt.Printf("Could not decrypt public partitions: %+v\n", err);
      os.Exit(1);
   }

   return hexKey, hexIV, partitions;
}

func showListing(path string) {
   _, _, partitions := getPartitions(path);

   fmt.Printf("Partition Count: %d\n", len(partitions));
   for connectionString, credentials := range(partitions) {
      var alias string = "";
      if (credentials.Alias != "") {
         alias = " (" + credentials.Alias + ")";
      }

      fmt.Printf("   %s%s - [%s, %s]\n", connectionString, alias, hex.EncodeToString(credentials.Key), hex.EncodeToString(credentials.IV));
   }
}

func add(path string) {
   var partitions map[string]fsdriver.PartitionCredentials;
   var hexKey string;
   var hexIV string;

   if (util.PathExists(path)) {
      hexKey, hexIV, partitions = getPartitions(path);
   } else {
      partitions = make(map[string]fsdriver.PartitionCredentials);
      fmt.Println("Creating new file. Enter file credentials.");
      hexKey, hexIV = getCredentials();
   }

   fmt.Println("Adding new entry.");

   fmt.Print("Connection String: ");
   connectionString := util.ReadLine(reader);

   fmt.Print("Alias (may be empty for no alias): ");
   alias := util.ReadLine(reader);

   entryHexKey, entryHexIV := getCredentials();

   entryKey, err := hex.DecodeString(entryHexKey);
   if (err != nil) {
      fmt.Printf("Could not hex decode entry key: %+v\n", err);
      os.Exit(1);
   }

   entryIV, err := hex.DecodeString(entryHexIV);
   if (err != nil) {
      fmt.Printf("Could not hex decode entry IV: %+v\n", err);
      os.Exit(1);
   }

   partitions[connectionString] = fsdriver.PartitionCredentials{
      Key: entryKey,
      IV: entryIV,
      Alias: alias,
   };

   err = fsdriver.SavePublicPartitionsFile(partitions, path, hexKey, hexIV);
   if (err != nil) {
      fmt.Printf("Failed to save public partitions: %+v\n", err);
      os.Exit(1);
   }
}

func remove(path string) {
   hexKey, hexIV, partitions := getPartitions(path);

   fmt.Print("Connection String: ");
   connectionString := util.ReadLine(reader);

   delete(partitions, connectionString);

   err := fsdriver.SavePublicPartitionsFile(partitions, path, hexKey, hexIV);
   if (err != nil) {
      fmt.Printf("Failed to save public partitions: %+v\n", err);
      os.Exit(1);
   }
}

func main() {
   args := os.Args;

   if (len(os.Args) != 3 || util.SliceHasString(args, "help") || util.SliceHasString(args, "h")) {
      showUsage();
      return;
   }

   switch args[1] {
   case "list", "ls":
      showListing(args[2]);
      break;
   case "add", "a":
      add(args[2]);
      break;
   case "remove", "rm":
      remove(args[2]);
      break;
   default:
      fmt.Printf("Unknown action (%s)\n", args[1]);
      showUsage();
   }
}
