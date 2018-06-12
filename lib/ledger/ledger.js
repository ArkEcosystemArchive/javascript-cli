const arkjs = require('arkjs')
// const bip39 = require('bip39')
const logger = require('../services/logger')

class Ledger {
  setNetwork (network) {
    this.network = network
    arkjs.crypto.setNetworkVersion(this.network.network.version)

    return this.network
  }

  async isSupported () {
    if (typeof (this.ARKLedger) === 'undefined') {
      try {
        await this.__initLedger()
        return Promise.resolve()
      } catch (error) {
        return Promise.reject(new Error('Ledger is not supported (does this machine have a USB port?).'))
      }
    }
  }

  async connect () {
    try {
      let comm = await this.ledgerco.comm_node.create_async()
      await this.LedgerArk.setComm(comm)
      let config = await this.LedgerArk.getAppConfiguration()
      logger.info(`Ledger connected, ARK v${config.version}`)
      return Promise.resolve()
    } catch (error) {
      let errorMsg
      switch (error) {
        case 'Invalid status 6d00':
          errorMsg = 'Ledger device found, please activate the ARK app.'
          break
        case 'Invalid channel;':
          errorMsg = 'Ledger device found, please de-activate "Browser support".'
          break
        default:
          errorMsg = 'Please connect your Ledger and activate the ARK app first.'
      }
      return Promise.reject(new Error(errorMsg))
    }
  }

  async getBip44Accounts (slip44 = null) {
    if (!slip44) {
      slip44 = this.network.network.slip44 ? this.network.network.slip44 : 111
    }

    let ledgerAccounts = []
    let i = 0
    let empty = true
    let publicKey
    while (empty) {
      let localpath = `44'/${slip44}'/${i}'/0/0`
      publicKey = await this.LedgerArk.getPublicKey(localpath)
      try {
        let account = await this.__getAccount(publicKey)
        if (account) {
          ledgerAccounts.push(account)
        }
        logger.info(`Ledger: Account found with address ${account.address}`)
        i++
      } catch (error) {
        // this is the first unused account on this ledger,and it's not known to the network
        const address = arkjs.crypto.getAddress(publicKey)
        let account = {
          address,
          unconfirmedBalance: 0,
          balance: 0,
          publicKey,
          'Status': 'Address unknown to the network'
        }
        ledgerAccounts.push(account)
        empty = false
      }
    }

    return ledgerAccounts
  }

  async recoverBip44Accounts (backupLedgerPassphrase, slip44) {
  }

  async signTransaction (path, transaction) {
    logger.warn('Please confirm your transaction on your Ledger device!')
    try {
      let transactionHex = arkjs.crypto.getBytes(transaction, true, true).toString("hex")
      let result = await this.LedgerArk.signTransaction(path, transactionHex) 
      return result.signature
    } catch(error) {
      return Promise.reject(error)
    }
  }

  // TODO Implement this correctly, whatever is used in LedgerArk doesn't work
  // Same goes for Desktop wallet, so my best guess is that it isn-t yet implement on the Ledger app
  async signMessage (path, message) {
    message = message.toString('hex')
    try{
      const signature = await this.LedgerArk.signPersonalMessage(path, message)
      return signature
    } catch (error) {
      return Promise.reject(error)
    }
  }

  async __getAccount (publicKey) {
    const address = arkjs.crypto.getAddress(publicKey)
    let account = {
      address,
      publicKey
    }

    try {
      account = await this.network.getFromNode(`/api/accounts?address=${account.address}`)
      return Promise.resolve(account.data.account)
    } catch (error) {
      console.log(error)
      return Promise.reject(error)
    }
  }

  async __initLedger () {
    try {
      this.ledgerco = require('ledgerco')
      this.LedgerArk = require('./LedgerArk.js')
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }
}
module.exports = new Ledger()
module.exports.logger = logger
