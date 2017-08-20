package messages;

import (
   "github.com/eriq-augustine/elfs-api/apierrors"
);

type RejectedToken struct {
   Success bool
   ReasonCode int
   ReasonDescription string
}

func NewRejectedToken(err apierrors.TokenValidationError) *RejectedToken {
   return &RejectedToken{false, err.Reason, err.Description()};
}

type AuthorizedToken struct {
   Success bool
   Token string
}

func NewAuthorizedToken(token string) *AuthorizedToken {
   return &AuthorizedToken{true, token};
}
