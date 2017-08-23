package model;

import (
   "github.com/eriq-augustine/elfs/dirent"
   "github.com/eriq-augustine/elfs/group"
   "github.com/eriq-augustine/elfs/user"
)

type DirEntry struct {
   Id dirent.Id
   IsFile bool
   Owner user.Id
   Name string
   CreateTimestamp int64
   ModTimestamp int64
   AccessTimestamp int64
   AccessCount uint
   GroupPermissions map[group.Id]group.Permission
   Size uint64  // bytes
   Md5 string
   Parent dirent.Id
}

func DirEntryFromDriver(direntInfo *dirent.Dirent) *DirEntry {
   return &DirEntry{
      Id: direntInfo.Id,
      IsFile: direntInfo.IsFile,
      Owner: direntInfo.Owner,
      Name: direntInfo.Name,
      CreateTimestamp: direntInfo.CreateTimestamp,
      ModTimestamp: direntInfo.ModTimestamp,
      AccessTimestamp: direntInfo.AccessTimestamp,
      AccessCount: direntInfo.AccessCount,
      GroupPermissions: direntInfo.GroupPermissions,
      Size: direntInfo.Size,
      Md5: direntInfo.Md5,
      Parent: direntInfo.Parent,
   };
}
