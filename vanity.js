var bip39 = require("bip39");
var arkjs = require("arkjs");

process.on("message", function(message){

  if(message.string){
    arkjs.crypto.setNetworkVersion(message.version);
    var address = "";
    var passphrase;
    var count = 0;
    while(address.toLowerCase().indexOf(message.string) == -1){
      passphrase = bip39.generateMnemonic();
      address = arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey);
      if(++count == 10){
        count=0;
        process.send({ count: 10 });
      }
    }
    process.send({ passphrase: passphrase });
  }
});
