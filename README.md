# bpl-client
CLI client for bpl blockchain.
You can connect to devnet, mainnet or your custom private/public ark-derived blockchain

Featuring:
- connection to network or a node
- get stats of network
- create or get status of account
- create vanity accounts (multi-cpu supported)
- send amount in USD, EUR or other FIAT currency at the market price (BPL only)
- create delegate, vote for delegate
- sign and verify message using your address.

# Installation
You need to have node installed. Then
```
$> npm install -g bplecosystem/bpl-client#master
$> bpl-client
  ____  _____  _      
 |  _ \|  __ \| |     
 | |_) | |__) | |     
 |  _ <|  ___/| |     
 | |_) | |    | |____ 
 |____/|_|    |______|
                      
bpl>
```

# Usage
```
bpl> help

  Commands:

    help [command...]                     Provides help for a given command.
    exit                                  Exits application.
    connect <network>                     Connect to network. Network is devnet or mainnet
    connect node <url>                    Connect to a server. For example "connect node 5.39.9.251:4000"
    disconnect                            Disconnect from server or network
    network stats                         Get stats from network
    account status <address>              Get account status
    account vote <name>                   Vote for delegate <name>. Remove previous vote if needed. Leave empty to clear vote
    account send <amount> <recipient>     Send <amount> bpl to <recipient>. <amount> format examples: 10, USD10.4, EUR100
    account delegate <username>           Register new delegate with <username>
    account create                        Generate a new random cold account
    account vanity <string>               Generate an address containing lowercased <string> (WARNING you could wait for long)
    message sign <message>                Sign a message
    message verify <message> <publickey>  Verify the <message> signed by the owner of <publickey> (you will be prompted to provide the signature)
    shBPL                                 No you don't want to use this command
```



```
bpl> connect devnet
Node: 5.39.9.246:4002, height: 21078
bpl devnet>
```

```
bpl devnet> account create
Seed    - private: rely cup brand sentence wolf amateur clog knock execute avocado they ready
WIF     - private: SBHAcXWeCEBDaLVUm4B3idHoLde2qrmi2gkxz8KXtNYfjVMK16pH
Address - public : DMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH
```

```
bpl devnet> account send 100 AMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH
passphrase: ************************************************************************
Transaction sent successfully with id 7adbf890c88dd345eacbac63e94610fa5f3905528cdc1c36740c3ba3fa3db302
```

```
bpl devnet> account delegate rockingark
passphrase: **************************************************************************
Transaction sent successfully with id b857f302611e4f36a33ea886f7bcb951633406ba1f5e40393893234a46ce54eb
```

```
bpl devnet> account status DMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH
{ address: 'DMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH',
  unconfirmedBalance: '7500000000',
  balance: '7500000000',
  publicKey: '020cfc61215f2682bd70cce14aaa6cfa6fa3b0507771cb1943aee071a7dd57bcf6',
  username: 'rockingark',
  vote: '0',
  producedblocks: 0,
  missedblocks: 0,
  rate: 52,
  approval: 0,
  productivity: 0 }
```

# License
Copyright © 2017 ARK.io | Copyright © 2017 FX Thoorens

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
