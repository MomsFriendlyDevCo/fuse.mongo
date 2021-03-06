@MomsFriendlyDevCo/fuse.mongo
=============================
FUSE file system mount for MongoDB databases.

Adds the `fuse.mongo` tool which connects a local directory to a MongoDB database, representing the database as a file-system on disk.

* Each top level directory represents a MongoDB collection (e.g. `/widgets` represents the widgets collection)
* Files within those directories are individual Mongo documents (e.g. `/widgets/5d6f2fdb4be85d16430c45ee.json`)
* Editing those files changes the document in real-time


Example
-------

```
> fuse.mongo localhost/test /media/testdb

> cd /media/testdb

> ls -l
drwx------ 1 mc mc 100 Apr 13 20:01 doodads/
drwx------ 1 mc mc 100 Apr 13 20:01 sprockets/
drwx------ 1 mc mc 100 Apr 13 20:01 widgets/

> cd widgets

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

Installation
------------
Install via NPM in the usual way:

```
npm i -g @momsfriendlydevco/fuse.mongo
```

(You may need a `sudo` prefix depending on your Node setup)


The binary should now be installed as `fuse.mongo`.


CLI usage
---------

```
Usage: fuse.mongo <URI> <mount-point>

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
  * Some "lazy" Connection URIs automatically corrected into full MongoURI strings: "database" -> "mongodb://localhost/database", "host/database" -> "mongodb://localhost/database"

Examples:

  # Mount localhost "test" database as /media/testdb
  fuse.mongo localhost/test /media/testdb
```


Debugging
---------
This module uses the [debug NPM module](https://github.com/visionmedia/debug) for debugging. To enable set the environment variable to `DEBUG=fuse.mongo`.


TODO
====

* [x] Examine collections
* [ ] Collection filtering via options
* [ ] Use collection stats like est. `doc size * average doc size` as collection size
* [ ] View support - specify a query to view the results
* [x] Examine docs
* [ ] Use collection stats for average doc size as the document size
* [x] Read doc
* [ ] Write doc
* [ ] Create doc (presumably ignore filename and use internal `_id` / create one)
* [ ] Remove doc
* [ ] Rename doc (Why?)
* [ ] Create collection with `mkdir`
* [ ] Remove collection with `rmdir`
* [ ] Support for indexes


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
