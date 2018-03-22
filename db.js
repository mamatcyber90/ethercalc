// Generated by LiveScript 1.5.0
(function(){
  var slice$ = [].slice;
  this.__DB__ = null;
  this.include = function(){
    var env, ref$, redisPort, redisHost, redisSockpath, redisPass, redisDb, dataDir, services, name, items, ref1$, redis, makeClient, RedisStore, db, EXPIRE, this$ = this;
    if (this.__DB__) {
      return this.__DB__;
    }
    env = process.env;
    ref$ = [env['REDIS_PORT'], env['REDIS_HOST'], env['REDIS_SOCKPATH'], env['REDIS_PASS'], env['REDIS_DB'], env['OPENSHIFT_DATA_DIR']], redisPort = ref$[0], redisHost = ref$[1], redisSockpath = ref$[2], redisPass = ref$[3], redisDb = ref$[4], dataDir = ref$[5];
    services = JSON.parse(process.env.VCAP_SERVICES || '{}');
    for (name in services) {
      items = services[name];
      if (/^redis/.test(name) && (items != null && items.length)) {
        ref1$ = [(ref$ = items[0].credentials)['port'], ref$['hostname'], ref$['password']], redisPort = ref1$[0], redisHost = ref1$[1], redisPass = ref1$[2];
      }
    }
    redisHost == null && (redisHost = 'localhost');
    redisPort == null && (redisPort = 6379);
    dataDir == null && (dataDir = process.cwd());
    redis = require('redis');
    makeClient = function(cb){
      var client;
      if (redisSockpath) {
        client = redis.createClient(redisSockpath);
      } else {
        client = redis.createClient(redisPort, redisHost);
      }
      if (redisPass) {
        client.auth(redisPass, function(){
          return console.log.apply(console, arguments);
        });
      }
      if (redisDb) {
        client.select(redisDb, function(){
          return console.log("Selecting Redis database " + redisDb);
        });
      }
      if (cb) {
        client.on('connect', cb);
      }
      return client;
    };
    try {
      RedisStore = require('zappajs/node_modules/socket.io/lib/stores/redis');
      this.io.configure(function(){
        var redisClient;
        redisClient = makeClient(function(){
          var redisPub, redisSub, store;
          redisPub = makeClient();
          redisSub = makeClient();
          store = new RedisStore({
            redis: redis,
            redisPub: redisPub,
            redisSub: redisSub,
            redisClient: redisClient
          });
          this$.io.set('store', store);
          this$.io.enable('browser client etag');
          this$.io.enable('browser client gzip');
          this$.io.enable('browser client minification');
          return this$.io.set('log level', 5);
        });
        return redisClient.on('error', function(){});
      });
    } catch (e$) {}
    db = makeClient(function(){
      db.DB = true;
      if (redisSockpath) {
        return console.log("Connected to Redis Server: unix:" + redisSockpath);
      } else {
        return console.log("Connected to Redis Server: " + redisHost + ":" + redisPort);
      }
    });
    EXPIRE = this.EXPIRE;
    db.on('error', function(err){
      var fs, minimatch, k, ref$, v, Commands;
      switch (false) {
      case db.DB !== true:
        return console.log("==> Lost connection to Redis Server - attempting to reconnect...");
      case !db.DB:
        return false;
      default:

      }
      console.log(err);
      console.log("==> Falling back to file system storage: " + dataDir + "/dump/");
      if (EXPIRE) {
        console.log("==> The --expire <seconds> option requires a Redis server; stopping!");
        process.exit();
      }
      fs = require('fs');
      db.DB = {};
      minimatch = require('minimatch');
      try {
        db.DB = {
          save_timestamps: {},
          timestamps: {}
        };
        if (fs.existsSync(dataDir + "/dump/")) {
          fs.readdirSync(dataDir + "/dump/").filter(partialize$.apply(/^[^.]/, [/^[^.]/.test, [void 8], [0]])).forEach(function(f){
            var key, type, id, k, ref$, v;
            key = f.split(".")[0];
            type = key.split("-")[0];
            id = key.split("-")[1];
            db.DB.timestamps["timestamp-" + id] = 0;
            db.DB.save_timestamps["timestamp-" + id] = 0;
            if (type === "snapshot") {
              db.DB[key] = fs.readFileSync(dataDir + "/dump/" + key + ".txt", 'utf8');
            } else if (type === "audit") {
              db.DB[key] = fs.readFileSync(dataDir + "/dump/" + key + ".txt", 'utf8').split("\n");
              for (k in ref$ = db.DB[key]) {
                v = ref$[k];
                db.DB[key][k] = db.DB[key][k].replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\\\/g, "\\");
              }
            }
          });
        } else {
          db.DB = JSON.parse(fs.readFileSync(dataDir + "/dump.json", 'utf8'));
          db.DB.save_timestamps = {};
          for (k in ref$ = db.DB.timestamps) {
            v = ref$[k];
            db.DB.save_timestamps[k] = -1;
          }
        }
        console.log("==> Restored previous session from dump storage");
        if (db.DB === true) {
          db.DB = {};
        }
      } catch (e$) {}
      Commands = {
        bgsave: function(cb){
          var oldTimestamps, k, ref$, v, id, newTimestamps, type, str, i$, len$, entry;
          if (!fs.existsSync(dataDir + "/dump/")) {
            fs.mkdirSync(dataDir + "/dump/");
          }
          oldTimestamps = {};
          for (k in ref$ = db.DB.save_timestamps) {
            v = ref$[k];
            id = k.split("-").pop();
            oldTimestamps[id] = v;
          }
          newTimestamps = {};
          for (k in ref$ = db.DB.timestamps) {
            v = ref$[k];
            id = k.split("-").pop();
            newTimestamps[id] = v;
            db.DB.save_timestamps[k] = v;
          }
          for (k in ref$ = db.DB) {
            v = ref$[k];
            id = k.split("-").pop();
            if (oldTimestamps[id] !== newTimestamps[id]) {
              type = k.split("-")[0];
              switch (type) {
              case "snapshot":
                fs.writeFileSync(dataDir + "/dump/" + k + ".txt", v, 'utf8');
                break;
              case "audit":
                str = "";
                for (i$ = 0, len$ = v.length; i$ < len$; ++i$) {
                  entry = v[i$];
                  str += entry.replace(/[\n]/g, "\\n").replace(/[\r]/g, "\\r").replace(/\\/g, "\\\\") + "\n";
                }
                fs.writeFileSync(dataDir + "/dump/" + k + ".txt", str, 'utf8');
              }
            }
          }
          return typeof cb == 'function' ? cb() : void 8;
        },
        get: function(key, cb){
          return typeof cb == 'function' ? cb(null, db.DB[key]) : void 8;
        },
        set: function(key, val, cb){
          db.DB[key] = val;
          return typeof cb == 'function' ? cb() : void 8;
        },
        exists: function(key, cb){
          return cb(null, db.DB.hasOwnProperty(key) ? 1 : 0);
        },
        rpush: function(key, val, cb){
          var ref$, ref1$;
          ((ref1$ = (ref$ = db.DB)[key]) != null
            ? ref1$
            : ref$[key] = []).push(val);
          return typeof cb == 'function' ? cb() : void 8;
        },
        lrange: function(key, from, to, cb){
          var ref$, ref1$;
          return typeof cb == 'function' ? cb(null, (ref1$ = (ref$ = db.DB)[key]) != null
            ? ref1$
            : ref$[key] = []) : void 8;
        },
        hset: function(key, idx, val, cb){
          var ref$, ref1$;
          ((ref1$ = (ref$ = db.DB)[key]) != null
            ? ref1$
            : ref$[key] = {})[idx] = val;
          return typeof cb == 'function' ? cb() : void 8;
        },
        hgetall: function(key, cb){
          var ref$, ref1$;
          return typeof cb == 'function' ? cb(null, (ref1$ = (ref$ = db.DB)[key]) != null
            ? ref1$
            : ref$[key] = {}) : void 8;
        },
        hdel: function(key, idx){
          if (db.DB[key] != null) {
            delete db.DB[key][idx];
          }
          return typeof cb == 'function' ? cb() : void 8;
        },
        rename: function(key, key2, cb){
          var ref$, ref1$;
          db.DB[key2] = (ref1$ = (ref$ = db.DB)[key], delete ref$[key], ref1$);
          return typeof cb == 'function' ? cb() : void 8;
        },
        keys: function(select, cb){
          return typeof cb == 'function' ? cb(null, Object.keys(db.DB).filter(minimatch.filter(select))) : void 8;
        },
        del: function(keys, cb){
          var i$, len$, key;
          if (Array.isArray(keys)) {
            for (i$ = 0, len$ = keys.length; i$ < len$; ++i$) {
              key = keys[i$];
              delete db.DB[key];
            }
          } else {
            delete db.DB[keys];
          }
          return typeof cb == 'function' ? cb() : void 8;
        }
      };
      importAll$(db, Commands);
      return db.multi = function(){
        var cmds, res$, i$, to$, name;
        res$ = [];
        for (i$ = 0, to$ = arguments.length; i$ < to$; ++i$) {
          res$.push(arguments[i$]);
        }
        cmds = res$;
        for (name in Commands) {
          (fn$.call(this, name));
        }
        cmds.results = [];
        cmds.exec = function(cb){
          var ref$, cmd, args, this$ = this;
          switch (false) {
          case !this.length:
            ref$ = this.shift(), cmd = ref$[0], args = ref$[1];
            db[cmd].apply(db, slice$.call(args).concat([function(_, result){
              this$.results.push(result);
              this$.exec(cb);
            }]));
            break;
          default:
            cb(null, this.results);
          }
        };
        return cmds;
        function fn$(name){
          cmds[name] = function(){
            var args, res$, i$, to$;
            res$ = [];
            for (i$ = 0, to$ = arguments.length; i$ < to$; ++i$) {
              res$.push(arguments[i$]);
            }
            args = res$;
            this.push([name, args]);
            return this;
          };
        }
      };
    });
    return this.__DB__ = db;
  };
  function partialize$(f, args, where){
    var context = this;
    return function(){
      var params = slice$.call(arguments), i,
          len = params.length, wlen = where.length,
          ta = args ? args.concat() : [], tw = where ? where.concat() : [];
      for(i = 0; i < len; ++i) { ta[tw[0]] = params[i]; tw.shift(); }
      return len < wlen && len ?
        partialize$.apply(context, [f, ta, tw]) : f.apply(context, ta);
    };
  }
  function importAll$(obj, src){
    for (var key in src) obj[key] = src[key];
    return obj;
  }
}).call(this);
