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

describe('crypt.getAddress', () => {
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
