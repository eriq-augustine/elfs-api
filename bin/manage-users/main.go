package main;

import (
   "bufio"
   "fmt"
   "os"

   driverutil "github.com/eriq-augustine/elfs/util"
   "golang.org/x/crypto/bcrypt"

   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/model"
   "github.com/eriq-augustine/elfs-api/util"
);

var reader *bufio.Reader = bufio.NewReader(os.Stdin);

func showUsage() {
   fmt.Println("Manage a users file.\n");
   fmt.Printf("usage: %s <action> <users file>\n\n", os.Args[0]);
   fmt.Println("Options:");
   fmt.Println("   list (ls)               - list the users present the the given file");
   fmt.Println("   info (i)                - get more detailed info on a specific user");
   fmt.Println("   add (a)                 - add a user to the given file (will create the file if it does not exist)");
   fmt.Println("   add-fscreds (afsc)      - add (put actually) filesystem credentials to a user");
   fmt.Println("   remove (rm)             - remove a user from the given file");
   fmt.Println("   remove-fscreds (rmfsc)  - remove filesystem credentials from a user");
   fmt.Println("   edit (e)                - edit a user in the given file");
   fmt.Println("   help (h)                - print this message and exit");
}

func bcryptPass(username string, password string) string {
   passhash := util.Weakhash(username, password);

   bcryptHash, err := bcrypt.GenerateFromPassword([]byte(passhash), bcrypt.DefaultCost);
   if (err != nil) {
      fmt.Println("Could not generate bcrypt hash: " + err.Error());
      os.Exit(1);
   }

   return string(bcryptHash);
}

func showListing(usersFile string) {
   if (!util.PathExists(usersFile)) {
      fmt.Printf("Users file (%s) does not exist.\n", usersFile);
      return;
   }

   usersMap := auth.LoadUsersFromFile(usersFile);

   fmt.Printf("User Count: %d\n", len(usersMap));
   for _, user := range(usersMap) {
      fmt.Println("   " + user.String());
   }
}

func addUser(usersFile string) {
   var usersMap map[string]*model.MemoryUser;
   if (util.PathExists(usersFile)) {
      usersMap = auth.LoadUsersFromFile(usersFile);
   } else {
      usersMap = make(map[string]*model.MemoryUser);
   }

   fmt.Print("Username: ");
   username := util.ReadLine(reader);

   fmt.Print("Password: ");
   passhash := bcryptPass(username, util.ReadPassword(reader));

   fmt.Print("Is Admin [y/N]: ");
   isAdmin := util.ReadBool(reader, false);

   usersMap[username] = &model.MemoryUser{
      DiskUser: model.DiskUser{
         Username: username,
         Passhash: passhash,
         IsAdmin: isAdmin,
         IV: driverutil.GenIV(),
         CipherPartitionCredentials: nil,
      },
      PartitionCredentials: make(map[string]model.PartitionCredential),
   };
   auth.SaveUsersFile(usersFile, usersMap);
}

func addFilesystemCreds(usersFile string) {
   if (!util.PathExists(usersFile)) {
      fmt.Printf("Users file (%s) does not exist.\n", usersFile);
      return;
   }

   usersMap := auth.LoadUsersFromFile(usersFile);

   fmt.Print("API Username: ");
   username := util.ReadLine(reader);

   apiUser, ok := usersMap[username];
   if (!ok) {
      fmt.Printf("User (%s) does not exist. Exiting...", username);
      os.Exit(1);
   }

   fmt.Print("API Password: ");
   weakhash := util.Weakhash(username, util.ReadPassword(reader));

   err := bcrypt.CompareHashAndPassword([]byte(apiUser.Passhash), []byte(weakhash));
   if (err != nil) {
      fmt.Printf("Incorrect password: %+v\n", err);
      os.Exit(1);
   }

   err = apiUser.DecryptPartitionCredentials(weakhash);
   if (err != nil) {
      fmt.Printf("Failed to decrypt partition credentials: %+v\n", err);
      os.Exit(1);
   }

   fmt.Print("FileSystem Connection String: ");
   connectionString := util.ReadLine(reader);

   fmt.Print("FileSystem Username: ");
   fsUsername := util.ReadLine(reader);

   fmt.Print("FileSystem Password: ");
   fsWeakhash := driverutil.ShaHash(util.ReadPassword(reader));

   apiUser.PartitionCredentials[connectionString] = model.PartitionCredential{
      Username: fsUsername,
      Weakhash: fsWeakhash,
      PartitionKey: nil,
      PartitionIV: nil,
   };

   err = apiUser.EncryptPartitionCredentials(weakhash);
   if (err != nil) {
      fmt.Printf("Failed to encrypt partition credentials: %+v\n", err);
      os.Exit(1);
   }

   auth.SaveUsersFile(usersFile, usersMap);
}

func removeUser(usersFile string) {
   if (!util.PathExists(usersFile)) {
      fmt.Printf("Users file (%s) does not exist.\n", usersFile);
      return;
   }

   usersMap := auth.LoadUsersFromFile(usersFile);

   fmt.Print("Username: ");
   username := util.ReadLine(reader);

   _, exists := usersMap[username];
   if (!exists) {
      fmt.Printf("User (%s) does not exist. Exiting...", username);
      os.Exit(1);
   }

   delete(usersMap, username);
   auth.SaveUsersFile(usersFile, usersMap);
}

func showInfo(usersFile string) {
   if (!util.PathExists(usersFile)) {
      fmt.Printf("Users file (%s) does not exist.\n", usersFile);
      return;
   }

   usersMap := auth.LoadUsersFromFile(usersFile);

   fmt.Print("API Username: ");
   username := util.ReadLine(reader);

   apiUser, ok := usersMap[username];
   if (!ok) {
      fmt.Printf("User (%s) does not exist. Exiting...", username);
      os.Exit(1);
   }

   fmt.Print("API Password: ");
   weakhash := util.Weakhash(username, util.ReadPassword(reader));

   err := bcrypt.CompareHashAndPassword([]byte(apiUser.Passhash), []byte(weakhash));
   if (err != nil) {
      fmt.Printf("Incorrect password: %+v\n", err);
      os.Exit(1);
   }

   err = apiUser.DecryptPartitionCredentials(weakhash);
   if (err != nil) {
      fmt.Printf("Failed to decrypt partition credentials: %+v\n", err);
      os.Exit(1);
   }

   fmt.Println(apiUser.LongString());
}

func removeFilesystemCreds(usersFile string) {
   if (!util.PathExists(usersFile)) {
      fmt.Printf("Users file (%s) does not exist.\n", usersFile);
      return;
   }

   usersMap := auth.LoadUsersFromFile(usersFile);

   fmt.Print("API Username: ");
   username := util.ReadLine(reader);

   apiUser, ok := usersMap[username];
   if (!ok) {
      fmt.Printf("User (%s) does not exist. Exiting...", username);
      os.Exit(1);
   }

   fmt.Print("API Password: ");
   weakhash := util.Weakhash(username, util.ReadPassword(reader));

   err := bcrypt.CompareHashAndPassword([]byte(apiUser.Passhash), []byte(weakhash));
   if (err != nil) {
      fmt.Printf("Incorrect password: %+v\n", err);
      os.Exit(1);
   }

   err = apiUser.DecryptPartitionCredentials(weakhash);
   if (err != nil) {
      fmt.Printf("Failed to decrypt partition credentials: %+v\n", err);
      os.Exit(1);
   }

   fmt.Print("FileSystem Connection String: ");
   connectionString := util.ReadLine(reader);

   delete(apiUser.PartitionCredentials, connectionString);

   err = apiUser.EncryptPartitionCredentials(weakhash);
   if (err != nil) {
      fmt.Printf("Failed to encrypt partition credentials: %+v\n", err);
      os.Exit(1);
   }

   auth.SaveUsersFile(usersFile, usersMap);
}

func editUser(usersFile string) {
   if (!util.PathExists(usersFile)) {
      fmt.Printf("Users file (%s) does not exist.\n", usersFile);
      return;
   }

   usersMap := auth.LoadUsersFromFile(usersFile);

   fmt.Print("Username: ");
   username := util.ReadLine(reader);

   user, exists := usersMap[username];
   if (!exists) {
      fmt.Printf("User (%s) does not exist. Exiting...", username);
      os.Exit(1);
   }

   fmt.Print("Password: ");
   passhash := bcryptPass(username, util.ReadPassword(reader));

   fmt.Print("Is Admin [y/N]: ");
   isAdmin := util.ReadBool(reader, false);

   usersMap[username] = &model.MemoryUser{
      DiskUser: model.DiskUser{
         Username: username,
         Passhash: passhash,
         IsAdmin: isAdmin,
         IV: user.IV,
         CipherPartitionCredentials: user.CipherPartitionCredentials,
      },
      PartitionCredentials: nil,
   };

   auth.SaveUsersFile(usersFile, usersMap);
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
      addUser(args[2]);
      break;
   case "add-fscreds", "afsc":
      addFilesystemCreds(args[2]);
      break;
   case "info", "i":
      showInfo(args[2]);
      break;
   case "remove", "rm":
      removeUser(args[2]);
      break;
   case "remove-fscreds", "rmfsc":
      removeFilesystemCreds(args[2]);
      break;
   case "edit", "e":
      editUser(args[2]);
      break;
   default:
      fmt.Printf("Unknown action (%s)\n", args[1]);
      showUsage();
   }
}
