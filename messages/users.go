package messages;

import (
   "github.com/eriq-augustine/elfs/group"
   "github.com/eriq-augustine/elfs/user"
)

type safeGroup struct {
   Id int
   Name string
   Admins []int
   Users []int
}

type safeUser struct {
   Id int
   Name string
}

type ListGroups struct {
   Success bool
   Groups []safeGroup
}

type ListUsers struct {
   Success bool
   Users []safeUser
}

func NewListGroups(groupMap map[group.Id]*group.Group) *ListGroups {
   var groups []safeGroup = make([]safeGroup, 0, len(groupMap));
   for _, fsGroup := range(groupMap) {
      var users []int = make([]int, 0, len(fsGroup.Users));
      var admins []int = make([]int, 0, len(fsGroup.Admins));

      for user, _ := range(fsGroup.Users) {
         users = append(users, int(user));
      }

      for admin, _ := range(fsGroup.Admins) {
         admins = append(admins, int(admin));
      }

      groups = append(groups, safeGroup{
         Id: int(fsGroup.Id),
         Name: fsGroup.Name,
         Admins: admins,
         Users: users,
      });
   }

   return &ListGroups{
      Success: true,
      Groups: groups,
   };
}

func NewListUsers(userMap map[user.Id]*user.User) *ListUsers {
   var users []safeUser = make([]safeUser, 0, len(userMap));
   for _, fsUser := range(userMap) {
      users = append(users, safeUser{
         Id: int(fsUser.Id),
         Name: fsUser.Name,
      });
   }

   return &ListUsers{
      Success: true,
      Users: users,
   };
}
