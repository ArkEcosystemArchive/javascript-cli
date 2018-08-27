'use strict'
const crypto = require('../../lib/utils/crypto.js')

describe('crypto', () => {
  it('should be an object', () => {
    expect(crypto).toBeObject()
  })
})

describe('crypto.sign', () => {
  it('should be a function', () => {
    expect(crypto.sign).toBeFunction()
  })

  it('should correctly sign a message', () => {
    const message = 'Hello World'
    const passphrase = 'this is a top secret passphrase'
    const networkVersion = 30 // devnet
    const publicKey = '034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192'
    const address = 'D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib'
    const signature = '304402200fb4adddd1f1d652b544ea6ab62828a0a65b712ed447e2538db0caebfa68929e02205ecb2e1c63b29879c2ecf1255db506d671c8b3fa6017f67cfd1bf07e6edd1cc8'

    const result = crypto.sign(message, passphrase, networkVersion)
    expect(result).toBeObject()
    expect(result).toContainKeys(['publicKey', 'address', 'signature', 'message'])
    expect(result.publicKey).toBe(publicKey)
    expect(result.address).toBe(address)
    expect(result.signature).toBe(signature)
    expect(result.message).toBe(message)
  })
})

describe('crypto.verify', () => {
  it('should be a function', () => {
    expect(crypto.verify).toBeFunction()
  })

  it('should correctly verify a message', () => {
    const message = 'Hello World'
    const signature = '304402200fb4adddd1f1d652b544ea6ab62828a0a65b712ed447e2538db0caebfa68929e02205ecb2e1c63b29879c2ecf1255db506d671c8b3fa6017f67cfd1bf07e6edd1cc8'
    const publicKey = '034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192'

    const result = crypto.verify(message, signature, publicKey)
    expect(result).toBeTrue()

    const badMsg = 'Will not verify'
    const badResult = crypto.verify(badMsg, signature, publicKey)
    expect(badResult).toBeFalse()
  })
})

describe('crypto.getAddress', () => {
  it('should be a function', () => {
    expect(crypto.getAddress).toBeFunction()
  })

  it('should correctly generate an address from a passphrase', () => {
    const passphrase = 'this is a top secret passphrase'
    const networkVersion = 30 // devnet
    const publicKey = '034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192'
    const address = 'D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib'

    const result = crypto.getAddress(passphrase, networkVersion)
    expect(result).toBeObject()
    expect(result).toContainKeys(['publicKey', 'address'])
    expect(result.publicKey).toBe(publicKey)
    expect(result.address).toBe(address)
  })
})

describe('crypto.registerDelegate', () => {
  it('should be a function', () => {
    expect(crypto.registerDelegate).toBeFunction()
  })

  it('should create a valid transaction', () => {
    const username = 'testdelegate'
    const passphrase = 'this is a top secret passphrase'
    const secondSecret = null
    const fee = 1000
    const transaction = crypto.registerDelegate(username, passphrase, secondSecret, fee)

    expect(transaction).toContainKeys(['asset', 'fee', 'id', 'senderPublicKey', 'signature', 'type', 'timestamp'])
    expect(transaction.asset.delegate.username).toBe(username)
  })
})

describe('crypto.createTransaction', () => {
  it('should be a function', () => {
    expect(crypto.createTransaction).toBeFunction()
  })

  it('should create a valid transaction', () => {
    const recepient = 'D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib'
    const amount = 100000000
    const vendorField = 'Hello World'
    const passphrase = 'this is a top secret passphrase'
    const secondSecret = null
    const fee = 1000
    const transaction = crypto.createTransaction(recepient, amount, vendorField, passphrase, secondSecret, fee)

    expect(transaction).toContainKeys(['amount', 'fee', 'id', 'recipientId', 'senderPublicKey', 'signature', 'type', 'vendorField'])
  })
})

describe('crypto.createVoteTransaction', () => {
  it('should be a function', () => {
    expect(crypto.createVoteTransaction).toBeFunction()
  })

  it('should create a valid transaction', () => {
    const publicKey = '034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192'
    const passphrase = 'this is a top secret passphrase'
    const secondSecret = null
    const fee = 1000
    const transaction = crypto.createVoteTransaction(publicKey, passphrase, secondSecret, fee, false)

    expect(transaction).toContainKeys(['fee', 'id', 'senderPublicKey', 'signature', 'type', 'asset'])
    expect(transaction.asset.votes[0]).toBe(`+${publicKey}`)
  })
})

describe('crypto.createSignatureTransaction', () => {
  it('should be a function', () => {
    expect(crypto.createSignatureTransaction).toBeFunction()
  })

  it('should create a valid transaction', () => {
    const passphrase = 'this is a top secret passphrase'
    const secondSecret = 'test secret'
    const fee = 1000
    const transaction = crypto.createSignatureTransaction(passphrase, secondSecret, fee)

    expect(transaction).toContainKeys(['fee', 'id', 'senderPublicKey', 'signature', 'type', 'asset'])
    expect(transaction.asset.signature).toContainKey('publicKey')
  })
})

describe('crypto.getTransactionId', () => {
  it('should be a function', () => {
    expect(crypto.getTransactionId).toBeFunction()
  })

  it('should create a valid transaction', () => {
    const recepient = 'D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib'
    const amount = 100000000
    const vendorField = 'Hello World'
    const passphrase = 'this is a top secret passphrase'
    const secondSecret = null
    const fee = 1000
    const transaction = crypto.createTransaction(recepient, amount, vendorField, passphrase, secondSecret, fee)
    const transactionId = crypto.getTransactionId(transaction)
    expect(transactionId).toBe(transaction.id)
  })
})
