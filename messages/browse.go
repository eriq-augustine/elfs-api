package messages;

import (
   "github.com/eriq-augustine/elfs-api/model"
)

type ListDir struct {
   Success bool
   IsDir bool
   DirEntries []*model.DirEntry
}

func NewListDir(dirEntries []*model.DirEntry) *ListDir {
   return &ListDir{true, true, dirEntries};
}

// TODO(eriq): Need this?

type ViewDirent struct {
   Success bool
   IsDir bool
   Dirent *model.DirEntry
}

func NewViewDirent(dirent *model.DirEntry) *ViewDirent {
   return &ViewDirent{true, false, dirent};
}
