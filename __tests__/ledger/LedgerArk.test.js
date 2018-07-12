'use strict'

const LedgerArk = require('../../lib/ledger/LedgerArk.js')

describe('LedgerArk', () => {
  it('should be defined', () => {
    expect(LedgerArk).toBeObject()
  })
})

describe('LedgerArk.setComm', () => {
  it('should be defined', () => {
    expect(LedgerArk.setComm).toBeFunction()
  })
})

describe('LedgerArk.getPublicKey', () => {
  it('should be defined', () => {
    expect(LedgerArk.getPublicKey).toBeFunction()
  })
})

describe('LedgerArk.signTransaction', () => {
  it('should be defined', () => {
    expect(LedgerArk.signTransaction).toBeFunction()
  })
})

describe('LedgerArk.getAppConfiguration', () => {
  it('should be defined', () => {
    expect(LedgerArk.getAppConfiguration).toBeFunction()
  })
})
