package messages;

type GeneralStatus struct {
   Success bool
   Code int
}

func NewGeneralStatus(success bool, code int) *GeneralStatus {
   return &GeneralStatus{success, code};
}
