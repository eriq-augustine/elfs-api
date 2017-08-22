package util;

// Utilities for CLI operations.
// Most of the operations will just panic on error.

import (
   "bufio"
   "fmt"
   "strings"

   "github.com/eriq-augustine/golog"
   "github.com/howeyc/gopass"
);

func ReadLine(reader *bufio.Reader) string {
   text, err := reader.ReadString('\n')
   if (err != nil) {
      golog.PanicE("Error reading line", err);
   }
   return strings.TrimSpace(text);
}

func ReadPassword(reader *bufio.Reader) string {
   pass, err := gopass.GetPasswd();
   if (err != nil) {
      golog.PanicE("Error reading password", err);
   }

   return strings.TrimSpace(string(pass));
}

func ReadBool(reader *bufio.Reader, defaultValue bool) bool {
   stringValue := strings.ToLower(ReadLine(reader));

   if (stringValue == "") {
      return defaultValue;
   } else if (stringValue == "y" || stringValue == "yes" || stringValue == "t" || stringValue == "true") {
      return true;
   } else if (stringValue == "n" || stringValue == "no" || stringValue == "f" || stringValue == "false") {
      return false;
   } else {
      golog.Panic(fmt.Sprintf("Bad boolean value: %s.\nExiting\n", stringValue));
      return false;
   }
}
