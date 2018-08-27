'use strict'

const ledger = require('../../lib/ledger/ledger.js')

describe('ledger', () => {
  it('should be an object', () => {
    expect(ledger).toBeObject()
  })
})

describe('ledger.setNetwork', () => {
  it('should be a function', () => {
    expect(ledger.setNetwork).toBeFunction()
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
