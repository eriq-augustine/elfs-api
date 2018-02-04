# elfs-api
API Interface for an elfs backend.

## Generating keys.
You can do them by hand, or just use:
```
./bin/gen-credentials
```

## Setup

Get some keys.

```
./bin/elfs-cli -iv <iv> -key <key> -path <path> -type <'local' | 'aws'>
create <root password>
login root <root password>
```
