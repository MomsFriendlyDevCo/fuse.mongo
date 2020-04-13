@MomsFriendlyDevCo/fuse.mongoose
================================
FUSE file system mount for Mongoose / MongoDB databases.


```
> fuse.mongoose localhost/test /media/testdb

> cd /media/testdb

> ls -l
drwx------ 1 mc mc 100 Apr 13 20:01 locks/
drwx------ 1 mc mc 100 Apr 13 20:01 logs/

> cd logs

> ls -l
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d6f2fdb4be85d16430c45ee.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d6f31810539a345936e46c9.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d6f32e977f6053ac561780f.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d6f378777f6053ac5617810.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d6f378a77f6053ac5617811.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d6f378e77f6053ac5617812.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d70383d77f6053ac5617813.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d7038604be85d16430c45ef.json
-rw------- 1 mc mc 16777216 Apr 13 20:01 5d7038d00539a345936e46ca.json

> cat 5d6f378e77f6053ac5617812.json
{
	"_id": "5d6f378e77f6053ac5617812"
	... document contents as JSON ...
}
```



CLI usage
---------

```
Usage: fuse.mongoose <URI> <mount-point>

Options:
  -V, --version           output the version number
  -o, --opt <key=val...>  CSV of dotted notation config options to populate
                          (default: [])
  --debug                 Enable debug mode, automatically detected with shell
                          variable DEBUG
  -v, --verbose           Be verbose, specify multiple times for more verbosity
  -h, --help              display help for command

Notes:
  * Multiple config options can be provided via `-o opt1=val1,opt2=val2`
  * Options without values are assumed to be `=true` e.g. `-o o1=1,o2,o3`

Examples:

  # Mount localhost "test" database as /media/testdb
  fuse.mongoose localhost/test /media/testdb
```


API
===


FuseMongoose(options)
---------------------
Class instance to manage the FUSE mount.
Options override the `FuseMongoose.defaults` if specified.


FuseMongoose.defaults
---------------------
An object containing the following options.

| Option          | Type      | Default     | Description                                                                                           |
|-----------------|-----------|-------------|-------------------------------------------------------------------------------------------------------|
| `mount`         | `string`  |             | Directory path to mount as                                                                            |
| `mongoUri`      | `string`  |             | MongoDB URI to connect to of the form `"mongodb://user:pass@localhost:port/database"`                 |
| `mongoOptions`  | `Object`  | `{}`        | Additional options to pass to Mongo when connecting                                                   |
| `displayFolder` | `string`  | `"MongoDB"` | Name / icon on OSX                                                                                    |
| `mkdir`         | `boolean` | `true`      | Attempt to create the mount point automatically if missing                                            |
| `autoUnmount`   | `boolean` | `true`      | Automatically unmount the filesystem cleanly when the node process terminates or gets (nicely) killed |
| `docPrefix`     | `string`  | `""`        | Prefix used when formatting raw document IDs                                                          |
| `docSuffix`     | `string`  | `".json"`   | Suffix used when formatting raw document IDs                                                          |
| `logFrequency`  | `number`  | `1000`      | How often to output debugging information when pulling large collection contents                      |
