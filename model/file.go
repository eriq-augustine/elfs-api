package model;

import (
   "github.com/eriq-augustine/elfs/dirent"
)

// TODO(eriq): Get owner info.
// TODO(eriq): Either group or effective permissions.

type DirEntry struct {
   Id dirent.Id
   IsFile bool
   Name string
   CreateTimestamp int64
   ModTimestamp int64
   AccessTimestamp int64
   AccessCount uint
   Size uint64  // bytes
   Md5 string
   Parent dirent.Id
}

func DirEntryFromDriver(direntInfo *dirent.Dirent) *DirEntry {
   return &DirEntry{
      Id: direntInfo.Id,
      IsFile: direntInfo.IsFile,
      Name: direntInfo.Name,
      CreateTimestamp: direntInfo.CreateTimestamp,
      ModTimestamp: direntInfo.ModTimestamp,
      AccessTimestamp: direntInfo.AccessTimestamp,
      AccessCount: direntInfo.AccessCount,
      Size: direntInfo.Size,
      Md5: direntInfo.Md5,
      Parent: direntInfo.Parent,
   };
}
