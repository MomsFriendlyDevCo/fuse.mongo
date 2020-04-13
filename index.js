var debug = require('debug')('fuse.mongoose');
var Fuse = require('fuse-native');
var mongoose = require('mongoose');
var promisify = require('util').promisify;

var fuseMongoose = function(options) {
	var fm = this;


	/**
	* Settings used when managing the instance
	* @type {Object}
	*/
	fm.settings = {...fuseMongoose.defaults, ...options};


	/**
	* Fuse instance when intialized
	* @type {Fuse}
	*/
	fm.fuse;


	/**
	* Mongoose models
	* @type {Object}
	*/
	fm.models = {};


	/**
	* Initialize Fuse filesystem and kick off mounting
	* @returns {Promise} A promise which will resolve when the FS is available
	*/
	fm.setup = ()=> Promise.resolve()
		// Sanity checks {{{
		.then(()=> {
			if (!fm.settings.mount) throw new Error(`Invalid mount path "${fm.settings.mount}"`);
		})
		// }}}
		.then(()=> debug('Setup FUSE'))
		.then(()=> fm.fuse = new Fuse(fm.settings.mount, {
			init: fm.init,
			readdir: (path, cb) => fm.route('readDir', path, {cb, fallback: ()=> []}),
			getattr: (path, cb) => fm.route('getAttr', path, {cb}),
			/*
			open: (path, flags, cb) => fm.route('open', path, {cb}),
			release: fm.release,
			read: (path, fd, buf, len, pos, cb) => fm.route('read', path, {cb}),
			*/
		}, {
			displayFolder: fm.settings.displayFolder,
			mkdir: fm.settings.mkdir,
		}))
		.then(()=> debug('FUSE setup complete'))
		.then(()=> debug('FUSE begin mount'))
		.then(()=> new Promise((resolve, reject) => fm.fuse.mount(e => {
			if (e) return reject(e);
			resolve();
		})))
		.then(()=> { // Setup autoUnmount
			if (!fm.settings.autoUnmount) return;
			process.on('SIGINT', code => {
				debug('SIGINT detected');
				debug('Auto umounting due SIGINT');
				fm.fuse.unmount();
				process.exit(1);
			});
		})


	fm.init = cb => Promise.resolve()
		.then(()=> debug('Init'))
		// Sanity checks {{{
		.then(()=> {
			if (!fm.settings.mount) throw new Error('No mount point specified');
			if (!fm.settings.mongoUri) throw new Error('No mongoUri option specified');
		})
		// }}}
		.then(()=> debug('DB connect'))
		.then(()=> mongoose.connect(fm.settings.mongoUri, fm.settings.mongoOptions))
		.then(()=> debug('CHECK REPONSE', fm.mongoose))
		.then(()=> mongoose.connection.db.collections())
		.then(collections => collections
			.map(c => c.s.namespace.collection)
			.sort()
			.forEach(collection => fm.models[collection] = mongoose.model(collection, new mongoose.Schema({})))
		)
		.then(()=> debug('Loaded collections:', Object.keys(fm.models).join(', ')))
		.then(()=> debug('Init success'))
		.then(()=> cb(0))
		.catch(e => {
			debug('Init fail:', e);
			cb(e);
		})

	fm.paths = [
		/*
		{ // NOTE: all routes are loaded in this exact order
			re: RegExp, // Matcher for the path
			readDir: Function, // ReadDir, returns array of file names
			getAttr: Function, // Expects stats object response
		},
		*/
		{ // Root directory
			id: 'root',
			re: /^\/$/,
			readDir: req => Object.keys(fm.models),
			getAttr: req => fm.settings.defaultRootStats(),
		},
		{ // Dot files in root - probably nosy processes looking for .Trash
			id: 'root-dotfiles',
			re: /^\/\./,
			getAttr: req => Promise.reject(Fuse.ENOENT),
		},
		{ // Collection contents
			id: 'collection-docs-by-id',
			re: /^\/(?<collection>.+?)\/(?<id>.+)\.json$/,
			getAttr: req => Promise.resolve()
				.then(()=> debug('Get doc stats', req.params.id + '/' + req.params.collection))
				.then(()=> fm.settings.defaultDocStats()),
		},
		{ // Collection directories
			id: 'collections',
			re: /^\/(?<collection>.+)$/,
			getAttr: req => Promise.resolve()
				.then(()=> debug('Get collection stats', req.params.collection))
				.then(()=> fm.settings.defaultCollectionStats()),
			readDir: req => Promise.resolve()
				.then(()=> fm.models[req.params.collection] || Promise.reject(Fuse.ENOENT)) // Collection is valid?
				.then(()=> debug('Query collection IDs for', req.params.collection))
				.then(()=> new Promise((resolve, reject) => {
					var ids = [];
					fm.models[req.params.collection]
						.find()
						.select('_id').lean()
						.cursor()
						.on('data', doc => {
							if ((ids.length % fm.settings.logFrequency) == 0) debug('Found', ids.length, 'docs');
							ids.push(fm.settings.docPrefix + doc._id + fm.settings.docSuffix)
						})
						.on('end', ()=> resolve(ids))
						.on('error', reject)
				}))
		},
	];


	/**
	* Route a FUSE method in a similar way to Express middleware
	* @param {string} method The method to route, should match the camelCased version of the FUSE operation
	* @param {string} path Raw root demoninated path (e.g. '/' for root dir)
	* @param {Object} [options] Additional options to pass
	* @param {function} [options.cb] fuse-native callback function if this function is to entirely manage the routing, otherwise the promise response is handed back to the caller
	* @param {function} [options.fallback] Alternative function to use if the method does not exist within the matched route
	* @returns {Promise} A promise which will resolve with the response. If options.cb is present this will be a generic Promise.resolve() / Promise.reject() as the output has already been sent
	*/
	fm.route = (method, path, options) => {
		var settings = {
			cb: false,
			fallback: false,
			...options,
		};
		var req = {};

		var found = fm.paths.find(candiate => {
			var bits = candiate.re.exec(path)
			if (bits) {
				req.params = bits.groups;
				return true;
			} else {
				return false;
			}
		})

		var promised;
		if (!found) {
			debug(`Unknown path access "${path}"`);
			promised = Promise.reject(Fuse.ENOENT);
		} else if (found[method]) {
			promised = Promise.resolve(found[method](req));
		} else if (settings.fallback) {
			debug(`No method, "${method}" for path ID ${found.id} / "${path}", use fallback`);
			promised = settings.fallback(req);
		} else {
			debug(`No method, "${method}" for path ID ${found.id} / "${path}", NO FALLBACK`);
			promised = Promise.reject(Fuse.ENOENT);
		}

		// Handle callback managing ourselves rather than relaying on
		if (settings.cb) {
			promised
				.then(res => {
					// debug('===', res);
					settings.cb(0, res);
				})
				.catch(code => {
					debug('!!!', code);
					if (isFinite(code)) return settings.cb(parseInt(code));
					settings.cb(Fuse.ENOENT, code);
				})
		} else {
			return promised;
		}
	};

	return this;
};


fuseMongoose.defaults = {
	mount: undefined,
	mongoUri: undefined,
	mongoOptions: {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	},
	displayFolder: 'MongoDB',
	mkdir: true,
	autoUnmount: true,
	logFrequency: 1000,
	docPrefix: '',
	docSuffix: '.json',
	defaultRootStats: ()=> ({
		mtime: new Date(),
		atime: new Date(),
		ctime: new Date(),
		size: 100,
		mode: 0040000 + 0600, // Dir + rwx, Use meta flags at https://unix.stackexchange.com/a/39717 + permissions at https://wintelguy.com/permissions-calc.pl
		uid: process.getuid(),
		gid: process.getgid()
	}),
	defaultCollectionStats: ()=> ({
		mtime: new Date(),
		atime: new Date(),
		ctime: new Date(),
		size: 100,
		mode: 0040000 + 0700, // Dir + rwx
		uid: process.getuid(),
		gid: process.getgid()
	}),
	defaultDocStats: ()=> ({
		mtime: new Date(),
		atime: new Date(),
		ctime: new Date(),
		size: 100,
		mode: 0100000 + 0600, // File + rw
		uid: process.getuid(),
		gid: process.getgid()
	}),
};

module.exports = fuseMongoose;
