@MomsFriendlyDevCo/fuse.mongoose
================================
FUSE filesystem mount for Mongoose / MongoDB databases.


API
===


FuseMongoose(options)
---------------------
Class instance to manage the FUSE mount.
Options override the `FuseMongoose.defaults` if specified.


FuseMongoose.defaults
---------------------
An object containing the following options.

| Option | Type | Default | Description |
| `mount`    | `string` | | Directory path to mount as |
| `mongoUri` | `string` | | MongoDB URI to connect to of the form `"mongodb://user:pass@localhost:port/database"` |
| `mongoOptions` | `Object` | `{}` | Additional options to pass to Mongo when connecting |
| `displayFolder` | `string` | `"MongoDB"` | Name / icon on OSX |
| `mkdir`         | `boolean` | `true` | Attempt to create the mount point automatically if missing |
| `autoUnmount` | `boolean` | `true` | Automatically unmount the filesystem cleanly when the node process terminates or gets (nicely) killed |
