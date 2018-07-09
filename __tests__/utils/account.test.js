'use strict'

const account = require('../../lib/utils/account.js')
const mainnet = require('../__support__/mainnet.js')

describe('account', () => {
  it('should be defined', () => {
    expect(account).toBeDefined()
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

  it('should retrieve the delegate voted for by an address', async () => {
    await mainnet.initNetwork()
    const address = 'ATsPMTAHNsUwKedzNpjTNRfcj1oRGaX5xC'
    const delegate = await account.getDelegate(mainnet.network, address)

    expect(delegate.address).toBeDefined()
    expect(delegate.username).toBeDefined()
  })

  it('should throw an Error for unvalid address input', async () => {
    await mainnet.initNetwork()
    const address = 'NotAValidAddress'
    let error = null
    try {
      await account.getDelegate(mainnet.network, address)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(Error)
  })

  it('should throw an Error when an account has not voted for a delegate', async () => {
    await mainnet.initNetwork()
    const address = 'AUKRmcvK1XBK4VK6Ha3H6QdTnCafPNPKDT' // arbitrary address from the explorer top-wallets
    let error = null
    try {
      await account.getDelegate(mainnet.network, address)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(Error)
  })
})

describe('account.isValidDelegate', () => {
  it('should be a function', () => {
    expect(account.isValidDelegate).toBeFunction()
  })

  it('should retrieve a delegate object for a known <username>', async () => {
    await mainnet.initNetwork()
    const username = 'arkpool'
    const delegate = await account.isValidDelegate(mainnet.network, username)

    expect(delegate.username).toBe(username)
  })

  it('should throw an Error when a delegate with <username> does not exist', async () => {
    await mainnet.initNetwork()
    const username = 'notAValidDelegate' 
    let error = null
    try {
      await account.isValidDelegate(mainnet.network, username)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(Error)
  })
})
