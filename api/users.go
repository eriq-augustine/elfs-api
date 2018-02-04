package api;

import (
   "github.com/eriq-augustine/goapi"

   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/messages"
);

func getGroups(username goapi.UserName) (interface{}, error) {
   return messages.NewListGroups(fsdriver.GetDriver().GetGroups()), nil;
}

func getUsers(username goapi.UserName) (interface{}, error) {
   return messages.NewListUsers(fsdriver.GetDriver().GetUsers()), nil;
}
