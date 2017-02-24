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
  return null;
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


vorpal
  .command('connect testnet', 'Connect to testnet')
  .action(function(args, callback) {
		var self = this;
    network=networks.testnet;
    server=network.peers[Math.floor(Math.random()*1000)%network.peers.length];
    request.get('http://'+server+'/api/blocks/getHeight', function(err, response, body){
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
    request.get('http://'+server+'/api/blocks/getNethash', function(err, response, body){
      if(err){
        self.log(colors.red("Failed to connect to server "+server+" - "+err));
        server=null;
        self.delimiter('ark>');
        return callback();
      }
      var nethash = JSON.parse(body).nethash;
      var networkname = getNetworkFromNethash(nethash);
      network = networks[networkname];
      self.log("Connected to network " + nethash + colors.green(" ("+networkname+")"));
      self.delimiter('ark '+server+'>');
      request.get('http://'+server+'/api/blocks/getHeight', function(err, response, body){
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
		request.get('http://'+server+'/api/peers', function(err, response, body){
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
          request.get('http://'+server+'/api/blocks/getHeight', function(err, response, body){
            delay=new Date().getTime()-delay;
            if(delays[delay]){
              delays[delay]++;
            }
            else{
              delays[delay]=1;
            }
            count++;
            spinner.text=Math.floor(100*count/peers.length)+"%";
            if(err){
              return cb();
            }
            else{
              var height=JSON.parse(body).height;
              if(heights[height]){
                heights[height]++;
              }
              else{
                heights[height]=1;
              }
              return cb();
            }
          });
        },function(err){
          spinner.stop();
          self.log("Finished");
          self.log(heights);
          self.log(colors.green(figlet.textSync("delays")));
          self.log(colors.green(chart(Object.values(delays),{
            width: 80,
            height: 20,
            pointChar: '█',
            negativePointChar: '░'
          })));
          self.log(cowsay.say({text:"Looks right!"}));
        });
      }
    });
    callback();
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
    request.get('http://'+server+'/api/accounts?address='+address, function(err, response, body){
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
      request.get('http://'+server+'/api/delegates/get/?publicKey='+a.publicKey, function(err, response, body){
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
		self.log("Address - public :",require("arkjs").crypto.getKeys(passphrase).getAddress());
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
        self.log("address   : ",require("arkjs").crypto.getKeys(result.passphrase).getAddress());
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

vorpal.history('ark-client');

vorpal.log(colors.cyan(figlet.textSync("Ark Client","Slant")));

vorpal
  .delimiter('ark>')
  .show();
