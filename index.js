#!/usr/bin/env node
var arkjs = require("arkjs");
var crypto = require("crypto");
var figlet = require("figlet");
var colors = require("colors");
var request = require("request");
var requestPromise = require("request-promise-native");
var asciichart = require ('asciichart');
var chart = require ('chart');
var cliSpinners = require('cli-spinners');
var Table = require('ascii-table');
var ora = require('ora');
var cowsay = require('cowsay');
var async = require('async');
var vorpal = require('vorpal')();
var cluster = require('cluster');
var child_process = require('child_process');

var ledger = require('ledgerco')
var LedgerArk = require('./src/LedgerArk.js');
var ledgerWorker = child_process.fork('./ledger-worker');

var blessed = require('blessed');
var contrib = require('blessed-contrib');

var server;
var network;
var arkticker = {};
var currencies = ["USD","AUD", "BRL", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "IDR", "INR", "JPY", "KRW", "MXN", "RUB"]

var ledgerAccounts = [];
var ledgerBridge = null;
var ledgerComm   = null;

var networks = {
  devnet: {
    nethash: "578e820911f24e039733b45e4882b73e301f813a0d2c31330dafda84534ffa23",
    peers: [
      "167.114.29.51:4002",
      "167.114.29.52:4002",
      "167.114.29.53:4002",
      "167.114.29.54:4002",
      "167.114.29.55:4002"
    ]
  },
  mainnet: {
    nethash: "6e84d08bd299ed97c212c886c98a57e36545c8f5d645ca7eeae63a8bd62d8988",
    peers: [
      "5.39.9.240:4001",
      "5.39.9.241:4001",
      "5.39.9.242:4001",
      "5.39.9.243:4001",
      "5.39.9.244:4001",
      "5.39.9.250:4001",
      "5.39.9.251:4001",
      "5.39.9.252:4001",
      "5.39.9.253:4001",
      "5.39.9.254:4001",
      "5.39.9.255:4001",
      "5.39.53.48:4001",
      "5.39.53.49:4001",
      "5.39.53.50:4001",
      "5.39.53.51:4001",
      "5.39.53.52:4001",
      "5.39.53.53:4001",
      "5.39.53.54:4001",
      "5.39.53.55:4001",
      "37.59.129.160:4001",
      "37.59.129.161:4001",
      "37.59.129.162:4001",
      "37.59.129.163:4001",
      "37.59.129.164:4001",
      "37.59.129.165:4001",
      "37.59.129.166:4001",
      "37.59.129.167:4001",
      "37.59.129.168:4001",
      "37.59.129.169:4001",
      "37.59.129.170:4001",
      "37.59.129.171:4001",
      "37.59.129.172:4001",
      "37.59.129.173:4001",
      "37.59.129.174:4001",
      "37.59.129.175:4001",
      "193.70.72.80:4001",
      "193.70.72.81:4001",
      "193.70.72.82:4001",
      "193.70.72.83:4001",
      "193.70.72.84:4001",
      "193.70.72.85:4001",
      "193.70.72.86:4001",
      "193.70.72.87:4001",
      "193.70.72.88:4001",
      "193.70.72.89:4001",
      "193.70.72.90:4001"
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
  getFromNode('http://'+server+'/peer/list', function(err, response, body){

    if(err){
      vorpal.log(colors.red("Can't get peers from network: " + err));
      return cb(peers);
    }
    else {
      var respeers = JSON.parse(body).peers.map(function(peer){
        return peer.ip+":"+peer.port;
      }).filter(function(peer){
        return peer.status=="OK";
      });
      async.each(respeers, function(peer, cb){
        getFromNode('http://'+peer+'/api/blocks/getHeight', function(err, response, body){
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

function getFromNode(url, cb){
  nethash=network?network.nethash:"";
  request(
    {
      url: url,
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

function getARKTicker(currency){
  request({url: "https://api.coinmarketcap.com/v1/ticker/ark/?convert="+currency}, function(err, response, body){
    arkticker[currency]=JSON.parse(body)[0];
  });
}

function getAccount(container, seriesCb) {
  var getPassPhrase = function() {
    container.prompt({
      type: 'password',
      name: 'passphrase',
      message: 'passphrase: ',
    }, function(result){
      if (result.passphrase) {
        return seriesCb(null, {
          passphrase: result.passphrase,
        });
      } else{
        return seriesCb("Aborted.");
      }
    });
  }
  if (ledgerAccounts.length) {
    var message = 'We have found the following Ledgers: \n';
    ledgerAccounts.forEach(function(ledger, index) {
      var balance = network.config.symbol + (ledger.data.accountData.balance / 100000000);
      message += (index + 1) + ') ' + ledger.data.address + ' (' + balance + ')' + '\n';
    });
    message += 'N) passphrase\n\n';
    message += 'Please choose an option: ';
    container.prompt({
      type: 'input',
      name: 'account',
      message: message,
    }, function(result){
      if (result.account.toUpperCase() === 'N') {
        getPassPhrase();
      } else if (ledgerAccounts[result.account - 1]) {
        var ledger = ledgerAccounts[result.account - 1];
        return seriesCb(null, {
          address: ledger.data.address,
          publicKey: ledger.data.publicKey,
          path: ledger.path,
        });
      } else {
        return seriesCb("Failed to get Accounts");
      }
    });
  } else {
    getPassPhrase();
  }
}

async function populateLedgerAccounts() {
  if (!ledgerBridge) {
    return;
  }
  ledgerAccounts = [];
  var accounts = [];
  var account_index = 0;
  var path = "44'/111'/";
  var empty = false;

  while (!empty) {
    var localpath = path + account_index + "'/0/0";
    var result = null;
    try {
      await ledgerBridge.getAddress_async(localpath).then(
        (response) => { result = response }
      ).fail(
        (response) => { result = response }
      );
      if (result.publicKey) {
        arkjs.crypto.setNetworkVersion(network.config.version);
        result.address = arkjs.crypto.getAddress(result.publicKey);
        var accountData = null;
        await requestPromise({
          uri: 'http://' + server + '/api/accounts?address=' + result.address,
          headers: {
            nethash: network.nethash,
            version: '1.0.0',
            port: 1
          },
          timeout: 5000,
          json: true,
        }).then(
          (body) => { accountData = body }
        );
        if (!accountData || accountData.success === false) {
          empty = true;
          result = null;
        } else {
          result.accountData = accountData.account;
        }
      }
    } catch (e) {
      console.log('no request:', e);
      break;
    }
    if (result && result.address) {
      ledgerAccounts.push({
        data: result,
        path: localpath
      });
      account_index = account_index + 1;
    } else {
      empty = true;
    }
  }
}

async function ledgerSignTransaction(seriesCb, transaction, account, callback) {
  if (!account.publicKey || !account.path) {
    return callback(transaction);
  }

  transaction.senderId = account.address;
  if (transaction.type === 3) {
    transaction.recipientId = account.address;
  }
  transaction.senderPublicKey = account.publicKey;
  delete transaction.signature;
  var transactionHex = arkjs.crypto.getBytes(transaction, true, true).toString("hex");
  var result = null;
  console.log('Please sign the transaction on your Ledger');
  await ledgerBridge.signTransaction_async(account.path, transactionHex).then(
    (response) => { result = response }
  ).fail(
    (response) => { result = response }
  );
  if (result.signature && result.signature !== '00000100') {
    transaction.signature = result.signature;
    transaction.id = arkjs.crypto.getId(transaction);
  } else {
    transaction = null;
  }
  callback(transaction);
}

ledgerWorker.on('message', function (message) {
  if (message.connected && !ledgerComm && network) {
    ledger.comm_node.create_async().then((comm) => {
      ledgerComm = comm;
      ledgerBridge = new LedgerArk(ledgerComm);
      populateLedgerAccounts();
    }).fail((error) => {
      console.log('ledger error: ', error);
    });
  } else if (!message.connected && ledgerComm) {
    ledgerComm.close_async();
    ledgerComm = null;
    ledgerBridge = null;
  };
});

vorpal
  .command('connect <network>', 'Connect to network. Network is devnet or mainnet')
  .action(function(args, callback) {
		var self = this;
    network = networks[args.network];

      if(!network){
          self.log("Network not found");
          return callback();
      }

    server = network.peers[Math.floor(Math.random()*1000)%network.peers.length];
    findEnabledPeers(function(peers){
      if(peers.length>0){
        server=peers[0];
        network.peers=peers;
      }
    });
    getFromNode('http://'+server+'/api/loader/autoconfigure', function(err, response, body){
      network.config = JSON.parse(body).network;
      console.log(network.config);
    });
    getFromNode('http://'+server+'/peer/status', function(err, response, body){
      self.log("Node: " + server + ", height: " + JSON.parse(body).height);
      self.delimiter('ark '+args.network+'>');
      callback();
    });
  });


vorpal
  .command('connect node <url>', 'Connect to a server. For example "connect node 5.39.9.251:4000"')
  .action(function(args, callback) {
		var self = this;
    server=args.url;
    getFromNode('http://'+server+'/api/blocks/getNethash', function(err, response, body){
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
      if(!network){
        network = {
          nethash: nethash,
          peers:[server]
        }
        networks[nethash]=network;
      }
      getFromNode('http://'+server+'/api/loader/autoconfigure', function(err, response, body){
        network.config = JSON.parse(body).network;
        console.log(network.config);
      });
      self.log("Connected to network " + nethash + colors.green(" ("+networkname+")"));
      self.delimiter('ark '+server+'>');
      getFromNode('http://'+server+'/peer/status', function(err, response, body){
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
		getFromNode('http://'+server+'/peer/list', function(err, response, body){
      if(err){
        self.log(colors.red("Can't get peers from network: " + err));
        return callback();
      }
      else {
        var peers = JSON.parse(body).peers.map(function(peer){
          return peer.ip+":"+peer.port;
        });
        self.log("Checking "+peers.length+" peers");
        var spinner = ora({text:"0%",spinner:"shark"}).start();
        var heights={};
        var delays={};
        var count=0;
        async.each(peers, function(peer, cb){
          var delay=new Date().getTime();
          getFromNode('http://'+peer+'/peer/status', function(err, response, hbody){
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
              if(!height){
                return cb();
              }
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
    getFromNode('http://'+server+'/api/accounts?address='+address, function(err, response, body){
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
      getFromNode('http://'+server+'/api/delegates/get/?publicKey='+a.publicKey, function(err, response, body){
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
  .command('account vote <name>', 'Vote for delegate <name>. Remove previous vote if needed')
  .action(function(args, callback) {
    var self = this;
    if(!server){
      self.log("please connect to node or network before");
      return callback();
    }
    async.waterfall([
      function(seriesCb) {
        getAccount(self, seriesCb);
      },
      function(account, seriesCb) {
        var delegateName = args.name;
        arkjs.crypto.setNetworkVersion(network.config.version);
        var address = null;
        var publicKey = null;
        var passphrase = '';
        if (account.passphrase) {
          passphrase = account.passphrase;
          var keys = arkjs.crypto.getKeys(passphrase);
          publicKey = keys.publicKey;
          address = arkjs.crypto.getAddress(publicKey);
        } else if (account.publicKey) {
          address = account.address;
          publicKey = account.publicKey;
        } else {
          return seriesCb('No public key for account');
        }
        getFromNode('http://'+server+'/api/accounts/delegates/?address='+address, function(err, response, body) {
          body = JSON.parse(body);
          if (!body.success) {
            return seriesCb("Failed getting current vote: " + body.error);
          }
          var currentVote = null;
          if (body.delegates.length) {
            currentVote = body.delegates.pop();
            if (currentVote.username === delegateName) {
              return seriesCb('You have already voted for ' + delegateName);
            }
          }
          getFromNode('http://'+server+'/api/delegates/get/?username='+delegateName, function(err, response, body){
            var body = JSON.parse(body);
            if (!body.success) {
              return seriesCb("Failed: " + body.error);
            }
            var newDelegate = body.delegate;
            var confirmMessage = 'Vote for ' + delegateName + ' now';
            if (currentVote) {
              confirmMessage = 'Vote for ' + delegateName + ' and unvote ' + currentVote.username + ' now';
            }
            self.prompt({
              type: 'confirm',
              name: 'continue',
              default: false,
              message: confirmMessage,
            }, function(result){
              if (result.continue) {
                if (currentVote) {
                  var unvoteTransaction = arkjs.vote.createVote(passphrase, ['-'+currentVote.publicKey]);
                  ledgerSignTransaction(seriesCb, unvoteTransaction, account, function(unvoteTransaction) {
                    if (!unvoteTransaction) {
                      return seriesCb('Failed to sign transaction with ledger');
                    }
                    postTransaction(unvoteTransaction, function(err, response, body) {
                      if (err) {
                        return seriesCb('Failed to unvote previous delegate: ' + err);
                      } else if (!body.success){
                        return seriesCb("Failed to send transaction: " + body.error);
                      }
                      var transactionId = body.transactionIds.pop();
                      console.log('Waiting for unvote transaction (' + transactionId + ') to confirm.');
                      var checkTransactionTimerId = setInterval(function() {
                        getFromNode('http://' + server + '/api/transactions/get?id=' + transactionId, function(err, response, body) {
                          var body = JSON.parse(body);
                          if (!body.success && body.error !== 'Transaction not found') {
                            clearInterval(checkTransactionTimerId);
                            return seriesCb('Failed to fetch unconfirmed transaction: ' + body.error);
                          } else if (body.transaction) {
                            clearInterval(checkTransactionTimerId);
                            var transaction = arkjs.vote.createVote(passphrase, ['+'+newDelegate.publicKey]);
                            return seriesCb(null, transaction);
                          }
                        });
                      }, 2000);
                    });
                  });
                } else {
                  var transaction = arkjs.vote.createVote(passphrase, ['+'+newDelegate.publicKey]);
                  ledgerSignTransaction(seriesCb, transaction, account, function(transaction) {
                    if (!transaction) {
                      return seriesCb('Failed to sign transaction with ledger');
                    }
                    return seriesCb(null, transaction);
                  });
                }
              } else {
                return seriesCb("Aborted.")
              }
            });
          });
        });
      },
      function(transaction, seriesCb){
        postTransaction(transaction, function(err, response, body){
          if(err){
            seriesCb("Failed to send transaction: " + err);
          }
          else if(body.success){
            seriesCb(null, transaction);
          }
          else {
            seriesCb("Failed to send transaction: " + body.error);
          }
        });
      }
    ], function(err, transaction){
      if(err){
        self.log(colors.red(err));
      }
      else{
        self.log(colors.green("Transaction sent successfully with id "+transaction.id));
      }
      return callback();
    });
  });

vorpal
  .command('account unvote', 'Remove previous vote')
  .action(function(args, callback) {
    var self = this;
    if(!server){
      self.log("please connect to node or network before");
      return callback();
    }
    async.waterfall([
      function(seriesCb){
        getAccount(self, seriesCb);
      },
      function(account, seriesCb){
        arkjs.crypto.setNetworkVersion(network.config.version);
        var address = null;
        var publicKey = null;
        var passphrase = '';
        if (account.passphrase) {
          passphrase = account.passphrase;
          var keys = arkjs.crypto.getKeys(passphrase);
          publicKey = keys.publicKey;
          address = arkjs.crypto.getAddress(publicKey);
        } else if (account.publicKey) {
          address = account.address;
          publicKey = account.publicKey;
        } else {
          return seriesCb('No public key for account');
        }
        getFromNode('http://'+server+'/api/accounts/delegates/?address='+address, function(err, response, body) {
          body = JSON.parse(body);
          if (!body.success) {
            return seriesCb("Failed: " + body.error);
          }
          if (!body.delegates.length) {
            return seriesCb("You currently haven't voted for anyone.");
          }
          var lastDelegate = body.delegates.pop();
          var delegates = ['-' + lastDelegate.publicKey];
          self.prompt({
            type: 'confirm',
            name: 'continue',
            default: false,
            message: 'Removing last vote for ' + lastDelegate.username,
          }, function(result){
            if (result.continue) {
              var transaction = arkjs.vote.createVote(passphrase, delegates);
              ledgerSignTransaction(seriesCb, transaction, account, function(transaction) {
                if (!transaction) {
                  return seriesCb('Failed to sign transaction with ledger');
                }
                return seriesCb(null, transaction);
              });
            } else {
              return seriesCb("Aborted.");
            }
          });
        });
      },
      function(transaction, seriesCb){
        postTransaction(transaction, function(err, response, body){
          if(err){
            seriesCb("Failed to send transaction: " + err);
          }
          else if(body.success){
            seriesCb(null, transaction);
          }
          else {
            seriesCb("Failed to send transaction: " + body.error);
          }
        });
      }
    ], function(err, transaction){
      if(err){
        self.log(colors.red(err));
      }
      else{
        self.log(colors.green("Transaction sent successfully with id "+transaction.id));
      }
      return callback();
    });
  });

vorpal
  .command('account send <amount> <address>', 'Send <amount> ark to <address>. <amount> format examples: 10, USD10.4, EUR100')
  .action(function(args, callback) {
		var self = this;
    if(!server){
      self.log("please connect to node or network before");
      return callback();
    }
    var currency;
    var found = false;

    if(typeof args.amount != "number")
    {

      for(var i in currencies)
      {
        if(args.amount.startsWith(currencies[i]))
        {
          currency=currencies[i];
          args.amount = Number(args.amount.replace(currency,""));
          getARKTicker(currency);
          found = true;
          break;
        }
      }

      if(!found)
      {
        self.log("Invalid Currency Format");
        return callback();
      }
    }

    async.waterfall([
      function(seriesCb){
        getAccount(self, seriesCb);
      },
      function(account, seriesCb){
        arkjs.crypto.setNetworkVersion(network.config.version);
        var address = null;
        var publicKey = null;
        var passphrase = '';
        if (account.passphrase) {
          passphrase = account.passphrase;
          var keys = arkjs.crypto.getKeys(passphrase);
          publicKey = keys.publicKey;
          address = arkjs.crypto.getAddress(publicKey);
        } else if (account.publicKey) {
          address = account.address;
          publicKey = account.publicKey;
        } else {
          return seriesCb('No public key for account');
        }

        var arkamount = args.amount;
        var arkAmountString = args.amount;

        if(currency){
          if(!arkticker[currency]){
            return seriesCb("Can't get price from market. Aborted.");
          }
          arkamount = parseInt(args.amount * 100000000 / Number(arkticker[currency]["price_"+currency.toLowerCase()]))
          arkAmountString = arkamount/100000000;
        }

        self.prompt({
          type: 'confirm',
          name: 'continue',
          default: false,
          message: 'Sending '+arkAmountString+'ARK '+(currency?'('+currency+args.amount+') ':'')+'to '+args.address+' now',
        }, function(result){
          if (result.continue) {
            var transaction = arkjs.transaction.createTransaction(args.address, arkamount, null, passphrase);
            ledgerSignTransaction(seriesCb, transaction, account, function(transaction) {
              if (!transaction) {
                return seriesCb('Failed to sign transaction with ledger');
              }
              return seriesCb(null, transaction);
            });
          }
          else {
            return seriesCb("Aborted.")
          }
        });
      },
      function(transaction, seriesCb){
        postTransaction(transaction, function(err, response, body){
          if(err){
            seriesCb("Failed to send transaction: " + err);
          }
          else if(body.success){
            seriesCb(null, transaction);
          }
          else {
            seriesCb("Failed to send transaction: " + body.error);
          }
        });
      }
    ], function(err, transaction){
      if(err){
        self.log(colors.red(err));
      }
      else{
        self.log(colors.green("Transaction sent successfully with id "+transaction.id));
      }
      return callback();
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
    async.waterfall([
      function(seriesCb) {
        getAccount(self, seriesCb);
      },
      function(account, seriesCb) {
        arkjs.crypto.setNetworkVersion(network.config.version);
        var address = null;
        var publicKey = null;
        var passphrase = '';
        if (account.passphrase) {
          passphrase = account.passphrase;
          var keys = arkjs.crypto.getKeys(passphrase);
          publicKey = keys.publicKey;
          address = arkjs.crypto.getAddress(publicKey);
        } else if (account.publicKey) {
          address = account.address;
          publicKey = account.publicKey;
        } else {
          return seriesCb('No public key for account');
        }
        var transaction = arkjs.delegate.createDelegate(passphrase, args.username);
        ledgerSignTransaction(seriesCb, transaction, account, function(transaction) {
          if (!transaction) {
            return seriesCb('Failed to sign transaction with ledger');
          }
          return seriesCb(null, transaction);
        });
      },
      function(transaction, seriesCb) {
        postTransaction(transaction, function(err, response, body){
          if(err){
            seriesCb("Failed to send transaction: " + err);
          }
          else if(body.success){
            seriesCb(null, transaction);
          }
          else {
            seriesCb("Failed to send transaction: " + body.error);
          }
        });
      }
    ], function(err, transaction){
      if(err){
        self.log(colors.red(err));
      }
      else{
        self.log(colors.green("Transaction sent successfully with id "+transaction.id));
      }
      return callback();
    });
  });


vorpal
  .command('account create', 'Generate a new random cold account')
  .action(function(args, callback) {
		var self = this;
    if(!server){
      self.log("please connect to node or network before, in order to retrieve necessery information about address prefixing");
      return callback();
    }
    arkjs.crypto.setNetworkVersion(network.config.version);
    var passphrase = require("bip39").generateMnemonic();
		self.log("Seed    - private:",passphrase);
		self.log("WIF     - private:",arkjs.crypto.getKeys(passphrase).toWIF());
		self.log("Address - public :",arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey));
		callback();
  });

vorpal
  .command('account vanity <string>', 'Generate an address containing lowercased <string> (WARNING you could wait for long)')
  .action(function(args, callback) {
    var self=this;
    if(!server){
      self.log("please connect to node or network before, in order to retrieve necessery information about address prefixing");
      return callback();
    }

    arkjs.crypto.setNetworkVersion(network.config.version);
    var count=0;
    var numCPUs = require('os').cpus().length;
    var cps=[];
    self.log("Spawning process to "+numCPUs+" cpus");
    var spinner = ora({text:"passphrases tested: 0",spinner:"shark"}).start();
    for (var i = 0; i < numCPUs; i++) {
      var cp=child_process.fork(__dirname+"/vanity.js");
      cps.push(cp);
      cp.on('message', function(message){
        if(message.passphrase){
          spinner.stop();
          var passphrase = message.passphrase;
          self.log("Found after",count,"passphrases tested");
          self.log("Seed    - private:",passphrase);
          self.log("WIF     - private:",arkjs.crypto.getKeys(passphrase).toWIF());
          self.log("Address - public :",arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey));

          for(var killid in cps){
            cps[killid].kill();
          }
          callback();
        }
        if(message.count){
          count += message.count;
          spinner.text="passphrases tested: "+count;
        }
      });
      cp.send({string:args.string.toLowerCase(), version:network.config.version});
    }

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
        self.log("public key: ",arkjs.crypto.getKeys(result.passphrase).publicKey);
        self.log("address   : ",arkjs.crypto.getAddress(arkjs.crypto.getKeys(result.passphrase).publicKey));
        self.log("signature : ",arkjs.crypto.getKeys(result.passphrase).sign(hash).toDER().toString("hex"));

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
        	var ecpair = arkjs.ECPair.fromPublicKeyBuffer(publickey);
        	var ecsignature = arkjs.ECSignature.fromDER(signature);
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
