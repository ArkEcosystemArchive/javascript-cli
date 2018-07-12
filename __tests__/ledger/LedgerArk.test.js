'use strict'

const LedgerArk = require('../../lib/ledger/LedgerArk.js')

describe('LedgerArk', () => {
  it('should be an object', () => {
    expect(LedgerArk).toBeObject()
  })
})

describe('LedgerArk.setComm', () => {
  it('should be a function', () => {
    expect(LedgerArk.setComm).toBeFunction()
  })
})

describe('LedgerArk.getPublicKey', () => {
  it('should be a function', () => {
    expect(LedgerArk.getPublicKey).toBeFunction()
  })
})

describe('LedgerArk.signTransaction', () => {
  it('should be a function', () => {
    expect(LedgerArk.signTransaction).toBeFunction()
  })
})

describe('LedgerArk.getAppConfiguration', () => {
  it('should be a function', () => {
    expect(LedgerArk.getAppConfiguration).toBeFunction()
  })
})
