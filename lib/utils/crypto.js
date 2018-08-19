'use strict'
const arkecosystem = require('@arkecosystem/crypto')
const arkUtils = arkecosystem.utils
const ECPair = arkecosystem.ECPair
const ECSignature = arkecosystem.ECSignature
const crypto = arkecosystem.crypto

class Crypto {
  sign (msg, passphrase, networkVersion) {
    let hash = arkUtils.hash256(Buffer.from(msg, 'utf-8'))
    const publicKey = crypto.getKeys(passphrase).publicKey
    const address = crypto.getAddress(publicKey, networkVersion)
    const signature = crypto.getKeys(passphrase).sign(hash).toDER().toString('hex')

    const result = {
      publicKey,
      address,
      signature,
      message: msg
    }

    return result
  }

  verify (msg, signature, publicKey) {
    let hash = arkUtils.hash256(Buffer.from(msg, 'utf-8'))

    signature = Buffer.from(signature, 'hex')
    publicKey = Buffer.from(publicKey, 'hex')
    const ecpair = ECPair.fromPublicKeyBuffer(publicKey)
    const ecsignature = ECSignature.fromDER(signature)
    const verification = ecpair.verify(hash, ecsignature)

    return verification
  }
}

module.exports = new Crypto()
