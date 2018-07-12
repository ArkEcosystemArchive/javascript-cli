'use strict'

const LedgerArk = require('../../lib/ledger/LedgerArk.js')

describe('LedgerArk', () => {
  it('should be defined', () => {
    expect(LedgerArk).toBeDefined()
  })
})

describe('LedgerArk.setComm', () => {
  it('should be defined', () => {
    expect(LedgerArk.setComm).toBeDefined()
  })
})

describe('LedgerArk.getPublicKey', () => {
  it('should be defined', () => {
    expect(LedgerArk.getPublicKey).toBeDefined()
  })
})

describe('LedgerArk.signTransaction', () => {
  it('should be defined', () => {
    expect(LedgerArk.signTransaction).toBeDefined()
  })
})

describe('LedgerArk.getAppConfiguration', () => {
  it('should be defined', () => {
    expect(LedgerArk.getAppConfiguration).toBeDefined()
  })
})
