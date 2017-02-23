#!/usr/bin/env node
var arkjs = require("arkjs");
var figlet = require("figlet");
var colors = require("colors");
var request = require("request");
var vorpal = require("vorpal")();

var server;
var network;

var networks = {
  testnet:{
    nethash:"4befbd4cd1f2f10cbe69ac0b494b5ce070595ed23ee7abd386867c4edcdaf3bd",
    peers:[
      "5.39.9.245:4000",
      "5.39.9.246:4000",
      "5.39.9.247:4000",
      "5.39.9.248:4000",
      "5.39.9.249:4000"
    ]
  }
};

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
  )
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
      self.log("Connected to network " + JSON.parse(body).nethash);
      self.delimiter('ark '+server+'>');
      callback();
    });
    request.get('http://'+server+'/api/blocks/getHeight', function(err, response, body){
      self.log("Node height ", JSON.parse(body).height);
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
      for(var i in a){
        if(!a[i] || a[i].length==0) delete a[i];
      }
      request.get('http://'+server+'/api/delegates/get/?publicKey='+a.publicKey, function(err, response, body){
        var body = JSON.parse(body);
        if(body.success){
          var delegate=body.delegate;
          for(var j in delegate){
            a[j]=delegate[j];
          }
        }
        self.log(a);
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

vorpal.history('ark-client');

vorpal.log(colors.cyan(figlet.textSync("Ark Client","Slant")));

vorpal
  .delimiter('ark>')
  .show();
