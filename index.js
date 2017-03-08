#!/usr/bin/env node
var arkjs = require("arkjs");
var crypto = require("crypto");
var figlet = require("figlet");
var colors = require("colors");
var request = require("request");
var asciichart = require ('asciichart');
var chart = require ('chart');
var cliSpinners = require('cli-spinners');
var Table = require('ascii-table');
var ora = require('ora');
var cowsay = require('cowsay');
var async = require('async');
var vorpal = require("vorpal")();

var blessed = require('blessed');
var contrib = require('blessed-contrib');
//      , line = contrib.line(
//          { style:
//            { line: "yellow"
//            , text: "green"
//            , baseline: "black"}
//          , xLabelPadding: 3
//          , xPadding: 5
//          , label: 'Title'})
//      , data = {
//          x: ['t1', 't2', 't3', 't4'],
//          y: [5, 1, 7, 5]
//       }
//    screen.append(line) //must append before setting data
//    line.setData([data])
//
//    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
//      return process.exit(0);
//    });
//
//    screen.render()


// var CLI = require('clui'),
//     clc = require('cli-color');
// var os   = require('os');
// var Line          = CLI.Line,
// 		Gauge         = CLI.Gauge;
// 		Sparkline     = CLI.Sparkline;
//
// var drawTimeout;
// var requestSeries = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
// var errorSeries = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
//
// function draw() {
// 	console.log(clc.reset);
//
// 	var blankLine = new Line().fill().output();
//
// 	var total = os.totalmem();
// 	var free = os.freemem();
// 	var used = total-free;
// 	var human = Math.ceil(used / 1000000) + ' MB';
//
// 	var memoryLine = new Line()
// 		.padding(2)
// 		.column('Memory In Use', 20, [clc.cyan])
// 		.column(Gauge(used, total, 20, total * 0.8, human), 40)
// 		.fill()
// 		.output();
//
// 	var load = os.loadavg()[0];
// 	var maxLoad = os.cpus().length * 2;
// 	var danger = os.cpus().length;
//
// 	var loadLine = new Line()
// 		.padding(2)
// 		.column('System Load', 20, [clc.cyan])
// 		.column(Gauge(load, maxLoad, 20, danger, load.toString()), 40)
// 		.fill()
// 		.output();
//
// 	var uptimeLine = new Line()
// 		.padding(2)
// 		.column('Uptime', 20, [clc.cyan])
// 		.column(os.uptime().toString() + ' seconds', 40)
// 		.fill()
// 		.output();
//
// 	blankLine.output();
//
// 	requestSeries.push(Math.ceil((Math.random()*100)));
// 	requestSeries.shift();
//
// 	var requestLine = new Line()
// 		.padding(2)
// 		.column('Requests/Sec', 20, [clc.cyan])
// 		.column(Sparkline(requestSeries, ' reqs/sec'), 80)
// 		.fill()
// 		.output();
//
// 	errorSeries.push(Math.ceil((Math.random()*10)));
// 	errorSeries.shift();
//
// 	var errorLine = new Line()
// 		.padding(2)
// 		.column('Errors/Sec', 20, [clc.cyan])
// 		.column(Sparkline(errorSeries, ' errs/sec'), 80)
// 		.fill()
// 		.output();
//
// 	blankLine.output();
//
// 	drawTimeout = setTimeout(draw, 1000);
// }
//
// draw();
//
// process.stdout.on('resize', function() {
// 	clearTimeout(drawTimeout);
// 	draw();
// });

var server;
var network;

var networks = {
  testnet: {
    nethash: "4befbd4cd1f2f10cbe69ac0b494b5ce070595ed23ee7abd386867c4edcdaf3bd",
    peers: [
      "5.39.9.245:4000",
      "5.39.9.246:4000",
      "5.39.9.247:4000",
      "5.39.9.248:4000",
      "5.39.9.249:4000"
    ]
  }
};

function getNetworkFromNethash(nethash){
  for(var n in networks){
    if(networks[n].nethash == nethash){
      return n;
    }
  }
  return "unknown";
}

function findEnabledPeers(cb){
  var peers=[];
  getFromServer('http://'+server+'/peer/list', function(err, response, body){

    if(err){
      vorpal.log(colors.red("Can't get peers from network: " + err));
      return cb(peers);
    }
    else {
      var respeers = JSON.parse(body).peers.map(function(peer){
        return peer.ip+":"+peer.port;
      });
      async.each(respeers, function(peer, cb){
        getFromServer('http://'+peer+'/api/blocks/getHeight', function(err, response, body){
          if(body != "Forbidden"){
            peers.push(peer);
          }
          cb();
        });
      },function(err){
        return cb(peers);
      });
    }
  });
}

function postTransaction(transaction, cb){
  request(
    {
      url: 'http://'+server+'/peer/transactions',
      headers: {
        nethash: network.nethash,
        version: '1.0.0',
        port:1
      },
      method: 'POST',
      json: true,
      body: {transactions:[transaction]}
    },
    cb
  );
}

function getFromServer(api, cb){
  nethash=network?network.nethash:"";
  request(
    {
      url: api,
      headers: {
        nethash: nethash,
        version: '1.0.0',
        port:1
      },
      timeout: 5000
    },
    cb
  );
}

vorpal
  .command('connect testnet', 'Connect to testnet')
  .action(function(args, callback) {
		var self = this;
    network=networks.testnet;
    server=network.peers[Math.floor(Math.random()*1000)%network.peers.length];
    findEnabledPeers(function(peers){
      if(peers.length>0){
        server=peers[0];
        networks.testnet.peers=peers;
      }
    });
    getFromServer('http://'+server+'/peer/height', function(err, response, body){
      self.log("Node: " + server + ", height: " + JSON.parse(body).height);
      self.delimiter('ark testnet>');
      callback();
    });
  });

vorpal
  .command('connect node <url>', 'Connect to a server. For example "connect node 5.39.9.251:4000"')
  .action(function(args, callback) {
		var self = this;
    server=args.url;
    getFromServer('http://'+server+'/api/blocks/getNethash', function(err, response, body){
      if(err){
        self.log(colors.red("Public API unreacheable on this server "+server+" - "+err));
        server=null;
        self.delimiter('ark>');
        return callback();
      }
      try {
        var nethash = JSON.parse(body).nethash;
      }
      catch (error){
        self.log(colors.red("API is not returning expected result:"));
        self.log(body);
        server=null;
        self.delimiter('ark>');
        return callback();
      }

      var networkname = getNetworkFromNethash(nethash);
      network = networks[networkname];
      self.log("Connected to network " + nethash + colors.green(" ("+networkname+")"));
      self.delimiter('ark '+server+'>');
      getFromServer('http://'+server+'/peer/height', function(err, response, body){
        self.log("Node height ", JSON.parse(body).height);
      });
      callback();
    });
  });

vorpal
  .command('disconnect', 'Disconnect from server or network')
  .action(function(args, callback) {
		var self = this;
    self.log("Disconnected from "+server);
    self.delimiter('ark>');
    server=null;
    network=null;
    callback();
  });

vorpal
  .command('network stats', 'Get stats from network')
  .action(function(args, callback) {
    var self = this;
    if(!server){
      self.log("Please connect to node or network before");
      return callback();
    }
		getFromServer('http://'+server+'/peer/list', function(err, response, body){
      if(err){
        self.log(colors.red("Can't get peers from network: " + err));
        return callback();
      }
      else {
        var peers = JSON.parse(body).peers.map(function(peer){
          return peer.string;
        });
        self.log("Checking "+peers.length+" peers");
        var spinner = ora({text:"0%",spinner:"shark"}).start();
        var heights={};
        var delays={};
        var count=0;
        async.eachLimit(peers, 3, function(peer, cb){
          var delay=new Date().getTime();
          getFromServer('http://'+peer+'/peer/height', function(err, response, hbody){
            delay=new Date().getTime()-delay;
            if(delays[10*Math.floor(delay/10)]){
              delays[10*Math.floor(delay/10)]++;
            }
            else{
              delays[10*Math.floor(delay/10)]=1;
            }
            count++;
            spinner.text=Math.floor(100*count/peers.length)+"%";
            if(err){
              return cb();
            }
            else{
              var height=JSON.parse(hbody).height;
              if(heights[height]){
                heights[height]++;
              }
              else{
                heights[height]=1;
              }
              return cb();
            }
            return cb();
          });
        },function(err){
          spinner.stop();
          var screen = blessed.screen();
          var grid = new contrib.grid({rows: 12, cols: 12, screen: screen})
          var line = grid.set(0, 0, 6, 6, contrib.line,
              { style:
                 { line: "yellow"
                 , text: "green"
                 , baseline: "black"}
               , xLabelPadding: 3
               , xPadding: 5
               , label: 'Delays'});
          var data = {
               x: Object.keys(delays).map(function(d){return d+"ms"}),
               y: Object.values(delays)
            };
          screen.append(line); //must append before setting data
          line.setData([data]);

          var bar = grid.set(6, 0, 6, 12, contrib.bar, { label: 'Network Height', barWidth: 4, barSpacing: 6, xOffset: 0, maxHeight: 9})
          screen.append(bar); //must append before setting data
          bar.setData({titles: Object.keys(heights), data: Object.values(heights)});

          screen.onceKey(['escape'], function(ch, key) {
            screen.destroy();
          });
          screen.render();
        });
      }
    });

  });

vorpal
  .command('account status <address>', 'Get account status')
  .action(function(args, callback) {
    var self = this;
    if(!server){
      self.log("please connect to node or network before");
      return callback();
    }
    var address=args.address;
    getFromServer('http://'+server+'/api/accounts?address='+address, function(err, response, body){
      var a = JSON.parse(body).account;

      if(!a){
        self.log("Unknown on the blockchain");
        return callback();
      }
      for(var i in a){
        if(!a[i] || a[i].length==0) delete a[i];
      }
      delete a.address;
      var table = new Table();
      table.setHeading(Object.keys(a));
      table.addRow(Object.values(a));
      self.log(table.toString());
      getFromServer('http://'+server+'/api/delegates/get/?publicKey='+a.publicKey, function(err, response, body){
        var body = JSON.parse(body);
        if(body.success){
          var delegate=body.delegate;
          delete delegate.address;
          delete delegate.publicKey;
          table = new Table("Delegate");
          table.setHeading(Object.keys(delegate));
          table.addRow(Object.values(delegate));
          self.log(table.toString());
        }

        callback();
      });
    });
  });

vorpal
  .command('account send <amount> <recipient>', 'Send <amount> ark to <recipient>')
  .action(function(args, callback) {
		var self = this;
    if(!server){
      self.log("please connect to node or network before");
      return callback();
    }
    return this.prompt({
      type: 'password',
      name: 'passphrase',
      message: 'passphrase: ',
    }, function(result){
      if (result.passphrase) {
        var transaction = require("arkjs").transaction.createTransaction(args.recipient, parseInt(args.amount*100000000), null, result.passphrase);
        postTransaction(transaction, function(err, response, body){
          if(body.success){
            self.log(colors.green("Transaction sent successfully with id "+body.transactionIds[0]));
          }
          else{
            self.log(colors.red("Failed to send transaction: "+body.error));
          }
          callback();
        });
      } else {
        self.log('Aborted.');
        callback();
      }
    });
  });

vorpal
  .command('account delegate <username>', 'Register new delegate with <username> ')
  .action(function(args, callback) {
		var self = this;
    if(!server){
      self.log("please connect to node or network before");
      return callback();
    }
    return this.prompt({
      type: 'password',
      name: 'passphrase',
      message: 'passphrase: ',
    }, function(result){
      if (result.passphrase) {
        var transaction = require("arkjs").delegate.createDelegate(result.passphrase, args.username);
        postTransaction(transaction, function(err, response, body){
          if(body.success){
            self.log(colors.green("Transaction sent successfully with id "+body.transactionIds[0]));
          }
          else{
            self.log(colors.red("Failed to send transaction: "+body.error));
          }
          callback();
        });
      } else {
        self.log('Aborted.');
        callback();
      }
    });
  });


vorpal
  .command('account create', 'Generate a new random cold account')
  .action(function(args, callback) {
		var self = this;
    var passphrase = require("bip39").generateMnemonic();
		self.log("Seed    - private:",passphrase);
		self.log("WIF     - private:",require("arkjs").crypto.getKeys(passphrase).toWIF());
		self.log("Address - public :",require("arkjs").crypto.getAddress(require("arkjs").crypto.getKeys(passphrase).publicKey));
		callback();
  });

vorpal
  .command('account vanity <string>', 'Generate an address containing lowercase <string> (WARNING you could wait for long)')
  .action(function(args, callback) {
    address = "";
    var passphrase;
    var self = this;
    while(address.toLowerCase().indexOf(args.string) == -1){
      passphrase = require("bip39").generateMnemonic();
      address = require("arkjs").crypto.getAddress(require("arkjs").crypto.getKeys(passphrase).publicKey);
    }

    self.log("Seed    - private:",passphrase);
    self.log("WIF     - private:",require("arkjs").crypto.getKeys(passphrase).toWIF());
    self.log("Address - public :",require("arkjs").crypto.getAddress(require("arkjs").crypto.getKeys(passphrase).publicKey));
		callback();
  });

vorpal
  .command('message sign <message>', 'Sign a message')
  .action(function(args, callback) {
		var self = this;
    return this.prompt({
      type: 'password',
      name: 'passphrase',
      message: 'passphrase: ',
    }, function(result){
      if (result.passphrase) {
        var hash = crypto.createHash('sha256');
        hash = hash.update(new Buffer(args.message,"utf-8")).digest();
        self.log("public key: ",require("arkjs").crypto.getKeys(result.passphrase).publicKey);
        self.log("address   : ",require("arkjs").crypto.getAddress(require("arkjs").crypto.getKeys(result.passphrase).publicKey));
        self.log("signature : ",require("arkjs").crypto.getKeys(result.passphrase).sign(hash).toDER().toString("hex"));

      } else {
        self.log('Aborted.');
        callback();
      }
    });
  });

vorpal
  .command('message verify <message> <publickey>', 'Verify the <message> signed by the owner of <publickey> (you will be prompted to provide the signature)')
  .action(function(args, callback) {
		var self = this;
    return this.prompt({
      type: 'input',
      name: 'signature',
      message: 'signature: ',
    }, function(result){
      if (result.signature) {
        try{
          var hash = crypto.createHash('sha256');
          hash = hash.update(new Buffer(args.message,"utf-8")).digest();
          var signature = new Buffer(result.signature, "hex");
        	var publickey= new Buffer(args.publickey, "hex");
        	var ecpair = require("arkjs").ECPair.fromPublicKeyBuffer(publickey);
        	var ecsignature = require("arkjs").ECSignature.fromDER(signature);
        	var res = ecpair.verify(hash, ecsignature);
          self.log(res);
        }
        catch(error){
          self.log("Failed: ", error);
        }
        callback();
      } else {
        self.log('Aborted.');
        callback();
      }
    });

  });
var sharkspinner;
vorpal
  .command("shARK", "No you don't want to use this command")
  .action(function(args, callback) {
		var self = this;
    self.log(colors.red(figlet.textSync("shARK")));
    sharkspinner = ora({text:"Watch out, the shARK attack!",spinner:"shark"}).start();
    callback();
  });

vorpal
  .command("spARKaaaaa!")
  .hidden()
  .action(function(args, callback) {
    var time = 0;
    var self=this;
    sharkspinner && sharkspinner.stop();
    ["tux","meow","bunny","cower","dragon-and-cow"].forEach(function(spark){
      setTimeout(function(){
        self.log(cowsay.say({text:"SPAAAAARKKKAAAAAAA!", f:spark}));
  		}, time++*1000);
    });

    callback();
  });

vorpal.history('ark-client');

vorpal.log(colors.cyan(figlet.textSync("Ark Client","Slant")));

vorpal
  .delimiter('ark>')
  .show();
