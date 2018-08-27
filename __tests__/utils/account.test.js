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
    const addressObject = {
      address: 'AQvJHKCcTUJKBF9n7wxotE2LVxugG3rhjh',
      networkVersion,
      seed,
      publicKey: '03e734aba4bc673b5c106bd90dfb7fe19a2faf32aa0a4a40d62ddda9d41ab239e4'
    }

    expect(account.getAccountFromSeed(seed, networkVersion)).toMatchObject(addressObject)
  })

  it('should return a valid DARK account object for a seed and networkVersion <30>', () => {
    const networkVersion = 30
    const seed = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
    const addressObject = {
      address: 'DEHXB5HdRjYSuH8PHtJ3H6vquViHFVRQak',
      networkVersion,
      seed,
      publicKey: '03e734aba4bc673b5c106bd90dfb7fe19a2faf32aa0a4a40d62ddda9d41ab239e4'
    }

    expect(account.getAccountFromSeed(seed, networkVersion)).toMatchObject(addressObject)
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
