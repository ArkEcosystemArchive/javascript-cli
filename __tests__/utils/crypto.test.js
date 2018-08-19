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
    const msg = 'Point. Click. Blockchain.'
    const passphrase = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
    const networkVersion = 30 // devnet
    const publicKey = '03e734aba4bc673b5c106bd90dfb7fe19a2faf32aa0a4a40d62ddda9d41ab239e4'
    const address = 'DEHXB5HdRjYSuH8PHtJ3H6vquViHFVRQak'
    const signature = '304402202a50bc620e7f97a2e1d416ddca79988bbb8232f4428a9fddd5a187dd3c11462b022078355bf458fbd9aa1842bf119afa3f686027fcc724d9bb73b66b234e0d51066e'

    const result = crypto.sign(msg, passphrase, networkVersion)
    expect(result).toBeObject()
    expect(result).toContainKeys(['publicKey', 'address', 'signature', 'message'])
    expect(result.publicKey).toBe(publicKey)
    expect(result.address).toBe(address)
    expect(result.signature).toBe(signature)
    expect(result.message).toBe(msg)
  })
})

describe('crypto.verify', () => {
  it('should be a function', () => {
    expect(crypto.verify).toBeFunction()
  })

  it('should correctly verify a message', () => {
    const msg = 'Point. Click. Blockchain.'
    const signature = '304402202a50bc620e7f97a2e1d416ddca79988bbb8232f4428a9fddd5a187dd3c11462b022078355bf458fbd9aa1842bf119afa3f686027fcc724d9bb73b66b234e0d51066e'
    const publicKey = '03e734aba4bc673b5c106bd90dfb7fe19a2faf32aa0a4a40d62ddda9d41ab239e4'

    const result = crypto.verify(msg, signature, publicKey)
    expect(result).toBeTrue()

    const badMsg = 'Will not verify'
    const badResult = crypto.verify(badMsg, signature, publicKey)
    expect(badResult).toBeFalse()
  })
})
