package util;

import (
   "path/filepath"
   "os"
   "strings"
);

// Get the basename for |path|.
// That is, the name of the file (last component) without any extension.
func Basename(path string) string {
   ext := filepath.Ext(path);
   return strings.TrimSuffix(filepath.Base(path), ext);
}

func Ext(path string) string {
   return strings.TrimPrefix(filepath.Ext(path), ".");
}

// Tell if a path exists.
func PathExists(path string) bool {
   _, err := os.Stat(path);
   if (err != nil) {
      if os.IsNotExist(err) {
         return false;
      }
   }

   return true;
}
