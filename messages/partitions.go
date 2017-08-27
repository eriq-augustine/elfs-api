package messages;

type Partitions struct {
   Success bool
   Partitions []string
}

func NewPartitions(partitions []string) *Partitions {
   return &Partitions{
      Success: true,
      Partitions: partitions,
   };
}
