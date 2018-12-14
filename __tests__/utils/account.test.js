'use strict'

const account = require('../../lib/utils/account.js')

describe('account', () => {
  it('should be an object', () => {
    expect(account).toBeObject()
  })
})

describe('account.getAccountFromSeed', () => {
  it('should be a function', () => {
    expect(account.getAccountFromSeed).toBeFunction()
  })

  it('should return a valid ARK account object for a seed and networkVersion <23>', () => {
    const networkVersion = 23
    const seed = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
    expect(account.getAccountFromSeed(seed, networkVersion)).toContainKeys(['address', 'networkVersion', 'publicKey', 'passphrase'])
  })
})

describe('account.getDelegate', () => {
  it('should be a function', () => {
    expect(account.getDelegate).toBeFunction()
  })
})

describe('account.isValidDelegate', () => {
  it('should be a function', () => {
    expect(account.isValidDelegate).toBeFunction()
  })
})
