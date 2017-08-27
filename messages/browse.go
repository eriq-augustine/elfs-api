package messages;

import (
   "github.com/eriq-augustine/elfs-api/model"
)

type ListDir struct {
   Success bool
   IsDir bool
   DirEntry *model.DirEntry
   Children []*model.DirEntry
}

func NewListDir(entry *model.DirEntry, dirEntries []*model.DirEntry) *ListDir {
   return &ListDir{
      Success: true,
      IsDir: true,
      DirEntry: entry,
      Children: dirEntries,
   };
}

type FileInfo struct {
   Success bool
   IsDir bool
   DirEntry *model.DirEntry
}

func NewFileInfo(entry *model.DirEntry) *FileInfo {
   return &FileInfo{
      Success: true,
      IsDir: false,
      DirEntry: entry,
   };
}
