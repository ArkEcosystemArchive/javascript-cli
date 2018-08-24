'use strict'
const arkecosystem = require('@arkecosystem/crypto')
const arkUtils = arkecosystem.utils
const ECPair = arkecosystem.ECPair
const ECSignature = arkecosystem.ECSignature
const arkCrypto = arkecosystem.crypto
const transactionBuilder = arkecosystem.transactionBuilder

class Crypto {
  getAddress (passphrase, networkVersion) {
    const publicKey = arkCrypto.getKeys(passphrase).publicKey
    const address = arkCrypto.getAddress(publicKey, networkVersion)

    return {address, publicKey}
  }

  sign (message, passphrase, networkVersion) {
    const {address, publicKey} = this.getAddress(passphrase, networkVersion)
    const hash = arkUtils.sha256(Buffer.from(message, 'utf-8'))
    const signature = arkCrypto.getKeys(passphrase).sign(hash).toDER().toString('hex')

    const result = {
      publicKey,
      address,
      signature,
      message
    }
    return result
  }

  verify (message, signature, publicKey) {
    signature = Buffer.from(signature, 'hex')
    publicKey = Buffer.from(publicKey, 'hex')
    const hash = arkUtils.sha256(Buffer.from(message, 'utf-8'))
    const ecpair = ECPair.fromPublicKeyBuffer(publicKey)
    const ecsignature = ECSignature.fromDER(signature)
    const verification = ecpair.verify(hash, ecsignature)

    return verification
  }

  createTransaction (recepient, amount, vendorField, passphrase, secondSecret, fee) {
    let transaction = transactionBuilder
      .transfer()
      .amount(amount)
      .recipientId(recepient)
      .vendorField(vendorField)
      .fee(fee)
      .sign(passphrase)

    if (secondSecret !== null) {
      transaction = transaction.secondSign(secondSecret)
    }

    transaction = transaction.getStruct()
    return transaction
  }

  getTransactionId (transaction) {
    return arkCrypto.getId(transaction)
  }
}

module.exports = new Crypto()
