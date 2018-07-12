'use strict'

const ledger = require('../../lib/ledger/ledger.js')
const mainnet = require('../__support__/mainnet.js')

describe('ledger', () => {
  it('should be defined', () => {
    expect(ledger).toBeDefined()
  })
})

describe('ledger.setNetwork', () => {
  it('should be a function', () => {
    expect(ledger.setNetwork).toBeFunction()
  })

  it('should return a defined object for an existing network', async () => {
    await mainnet.initNetwork()
    expect(ledger.setNetwork(mainnet.network)).toBeDefined()
  })

  it('should throw Error for a badly formatted network', async () => {
    let badNetwork = {
      network: 'hasNetWorkButNoVersion'
    }
    expect(() => {
      ledger.setNetwork(badNetwork)
    }).toThrow()

    badNetwork = {
      noNetwork: 'hasNoNetWorkAndNoVersion'
    }
    expect(() => {
      ledger.setNetwork(badNetwork)
    }).toThrow()
  })
})

/// The functions below are only tested if they are defined, the tests would fail on a machine without a Ledger device connected
describe('ledger.isSupported', () => {
  it('should be a function', () => {
    expect(ledger.isSupported).toBeFunction()
  })
})

describe('ledger.connect', () => {
  it('should be a function', () => {
    expect(ledger.connect).toBeFunction()
  })
})

describe('ledger.getBip44Accounts', () => {
  it('should be a function', () => {
    expect(ledger.getBip44Accounts).toBeFunction()
  })
})

describe('ledger.signTransaction', () => {
  it('should be a function', () => {
    expect(ledger.signTransaction).toBeFunction()
  })
})

describe('ledger.__getAccount', () => {
  it('should be a function', () => {
    expect(ledger.__getAccount).toBeFunction()
  })
})

describe('ledger.__initLedger', () => {
  it('should be a function', () => {
    expect(ledger.__initLedger).toBeFunction()
  })
})
