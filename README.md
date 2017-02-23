# ark-client
CLI client for ark blockchain

# Installation
You need to have node installed. Then
```
$> npm install -g arkecosystem/ark-client#master
$> ark-client
    ___         __      _________            __
   /   |  _____/ /__   / ____/ (_)__  ____  / /_
  / /| | / ___/ //_/  / /   / / / _ \/ __ \/ __/
 / ___ |/ /  / ,<    / /___/ / /  __/ / / / /_  
/_/  |_/_/  /_/|_|   \____/_/_/\___/_/ /_/\__/  

ark>
```

# Usage
```
ark testnet> help

  Commands:

    help [command...]                  Provides help for a given command.
    exit                               Exits application.
    connect testnet                    Connect to testnet
    connect node <url>                 Connect to a server. For example "connect node 5.39.9.251:4000"
    disconnect                         Disconnect from server or network
    account status <address>           Get account status
    account send <amount> <recipient>  Send <amount> ark to <recipient>
    account delegate <username>        Register new delegate with <username>
    account create                     Generate a new random cold account
```


```
ark> account create
Seed    - private: rely cup brand sentence wolf amateur clog knock execute avocado they ready
WIF     - private: SBHAcXWeCEBDaLVUm4B3idHoLde2qrmi2gkxz8KXtNYfjVMK16pH
Address - public : AMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH
```

```
ark> connect testnet
Node: 5.39.9.246:4000, height: 21078
ark testnet>
```

```
ark testnet> account send 100 AMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH
passphrase: ************************************************************************
Transaction sent successfully with id 7adbf890c88dd345eacbac63e94610fa5f3905528cdc1c36740c3ba3fa3db302
```

```
ark testnet> account delegate rockingark
passphrase: **************************************************************************
Transaction sent successfully with id b857f302611e4f36a33ea886f7bcb951633406ba1f5e40393893234a46ce54eb
```

```
ark testnet> account status AMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH
{ address: 'AMUeELFkFtN5obvStkV9Zt44GEjEaYgKhH',
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
MIT
