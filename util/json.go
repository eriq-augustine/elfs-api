package util;

import (
   "encoding/json"

   "github.com/eriq-augustine/golog"
);

func ToJSON(data interface{}) (string, error) {
   bytes, err := json.Marshal(data);
   if (err != nil) {
      golog.ErrorE("Error converting to JSON", err);
      return "", err;
   }

   return string(bytes), nil;
}

func ToJSONPretty(data interface{}) (string, error) {
   bytes, err := json.MarshalIndent(data, "", "   ");
   if (err != nil) {
      golog.ErrorE("Error converting to JSON", err);
      return "", err;
   }

   return string(bytes), nil;
}
