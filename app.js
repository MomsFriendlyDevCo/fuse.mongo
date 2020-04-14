#!/usr/bin/env node

var commander = require('commander');
var debug = require('debug')('fuse.mongo');
require('commander-extras');
var FuseMongoose = require('./index');
var spawn = require('child_process').spawn;

var program = commander
	.version(require('./package.json').version)
	.name('fuse.mongo')
	.usage('<URI> <mount-point>')
	.option('-o, --opt <key=val...>', 'CSV of dotted notation config options to populate', (v, t) => t.concat(v.split(/\s*,\s*/)), [])
	.option('-f, --foreground', 'Run process in foreground (automatically implies --debug)')
	.option('--debug', 'Enable debug mode, automatically detected with shell variable DEBUG')
	.option('-v, --verbose', 'Be verbose, specify multiple times for more verbosity', (t, v) => v + 1, 0)
	.note('Multiple config options can be provided via `-o opt1=val1,opt2=val2`')
	.note('Options without values are assumed to be `=true` e.g. `-o o1=1,o2,o3`')
	.note('Some "lazy" Connection URIs automatically corrected into full MongoURI strings: "database" -> "mongodb://localhost/database", "host/database" -> "mongodb://localhost/database"')
	.example('fuse.mongo localhost/test /media/testdb', 'Mount localhost "test" database as /media/testdb')
	.parse(process.argv)

if (!program.foreground) {
	debug('Forking to background');
	spawn(process.argv.shift(), [...process.argv, '--foreground'], {
		stdio: 'inherit',
		detached: true,
	});
	process.exit(0);
}

/**
* Storage for this sessions data
* @type {Object}
*/
var session = {
	fuse: undefined,
};

Promise.resolve()
	// Process config {{{
	.then(()=> {
		if (debug.enabled) {
			program.debug = true;
		} else if (program.debug) {
			require('debug').enable('fuse.mongo');
		}

		program.opt = program.opt.reduce((t, v) => {
			var optBits = /^(.+?)=(.*)$/.exec(v);
			if (optBits) { // key=val
				_.set(t, optBits[1], optBits[2]);
			} else { // key=true
				_.set(t, v, true);
			}
			return t;
		}, {})

		program.opt.mongoUri = program.args.shift();
		program.opt.mount = program.args.shift();

		if (program.verbose > 1) console.log('Using config', program.opt);
	})
	// }}}
	// Boot FUSE instance {{{
	.then(()=> session.fuse = new FuseMongoose(program.opt))
	.then(()=> session.fuse.setup())
	// }}}
	// End {{{
	.catch(e => {
		console.warn(program.debug || debug.enabled ? e : e.toString());
		process.exit(1);
	})
	// }}}
