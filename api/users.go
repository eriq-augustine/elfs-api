package api;

import (
   "github.com/eriq-augustine/goapi"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/messages"
);

func getGroups(username goapi.UserName, partition string) (interface{}, error) {
   apiUser, ok := auth.GetUser(string(username));
   if (!ok) {
      // This should never happen since we made it past the auth middleware.
      return "", errors.New("User does not exist");
   }

   driver, _, err := fsdriver.GetDriver(apiUser, partition);
   if (err != nil) {
      return "", err;
   }

   return messages.NewListGroups(driver.GetGroups()), nil;
}

func getUsers(username goapi.UserName, partition string) (interface{}, error) {
   apiUser, ok := auth.GetUser(string(username));
   if (!ok) {
      // This should never happen since we made it past the auth middleware.
      return "", errors.New("User does not exist");
   }

   driver, _, err := fsdriver.GetDriver(apiUser, partition);
   if (err != nil) {
      return "", err;
   }

   return messages.NewListUsers(driver.GetUsers()), nil;
}
