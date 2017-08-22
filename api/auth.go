package api;

// Implements the "/auth/" portion of the api.
// (This file is not about implementing the authentication middleware.)

import (
   "net/http"

   "github.com/eriq-augustine/goapi"
   "github.com/pkg/errors"

   "github.com/eriq-augustine/elfs-api/apierrors"
   "github.com/eriq-augustine/elfs-api/auth"
   "github.com/eriq-augustine/elfs-api/fsdriver"
   "github.com/eriq-augustine/elfs-api/messages"
);

// Invalidating a token is akin to logging out.
// Note that one must have a valid token to invalidate their own token.
func invalidateToken(token goapi.Token) (interface{}, error) {
   ok, err := auth.InvalidateToken(string(token));

   if (err != nil) {
      return "", err;
   }

   return messages.NewGeneralStatus(ok, http.StatusOK), nil;
}

func requestToken(username string, passhash string) (interface{}, int, error) {
   token, err := auth.AuthenticateUser(username, passhash);
   if (err != nil) {
      validationErr, ok := err.(apierrors.TokenValidationError);
      if (!ok) {
         // Some other (non-validation) error.
         return "", 0, err;
      } else {
         return messages.NewRejectedToken(validationErr), http.StatusForbidden, err;
      }
   } else {
      return messages.NewAuthorizedToken(token), 0, nil;
   }
}

func createUser(username string, passhash string) (interface{}, error) {
   token, err := auth.CreateUser(username, passhash);
   if (err != nil) {
      return "", err;
   }

   return messages.NewAuthorizedToken(token), nil;
}

func loadPartitions(username goapi.UserName, hexKey string, hexIV string) (interface{}, int, error) {
   apiUser, ok := auth.GetUser(string(username));
   if (!ok) {
      // This should never happen since we made it past the auth middleware.
      return "", 0, errors.New("User does not exist");
   }

   if (!apiUser.IsAdmin) {
      return "", http.StatusUnauthorized, errors.New("Must be admin to load partitions");
   }

   err := fsdriver.LoadPublicPartitions(hexKey, hexIV);
   if (err != nil) {
      return "", 0, errors.WithStack(err);
   }

   return messages.NewGeneralStatus(true, http.StatusOK), 0, nil;
}
