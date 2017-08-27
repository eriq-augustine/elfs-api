package api;

import (
   "github.com/eriq-augustine/goapi"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/messages"
);

func getPartitions(username goapi.UserName) (interface{}, error) {
   apiUser, ok := auth.GetUser(string(username));
   if (!ok) {
      // This should never happen since we made it past the auth middleware.
      return "", errors.New("User does not exist");
   }

   return messages.NewPartitions(fsdriver.GetAvailablePartitions(apiUser)), nil;
}
