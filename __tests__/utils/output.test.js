'use strict'

const output = require('../../lib/utils/output.js')

describe('output', () => {
  it('should be defined', () => {
    expect(output).toBeDefined()
  })
})

describe('output.setFormat', () => {
  it('should be a function', () => {
    expect(output.setFormat).toBeFunction()
  })

  it('should be ok for table', () => {
    expect(output.setFormat('table')).toBeTruthy()
  })

  it('should be ok for json', () => {
    expect(output.setFormat('json')).toBeTruthy()
  })

  it('should throw on other input than json or table', () => {
    expect(() => {
      output.setFormat('ark')
    }).toThrow()
  })
})

describe('output.setCurrencySymbol', () => {
  it('should be a function', () => {
    expect(output.setCurrencySymbol).toBeFunction()
  })

  it('should correctly define and set the inputted currency symbol for the output object', () => {
    const currencySymbol = 'Ѧ'
    output.setCurrencySymbol(currencySymbol)
    expect(output.symbol).toBeDefined()
    expect(output.symbol).toBe(currencySymbol)
  })
})

describe('output.setTitle', () => {
  it('should be a function', () => {
    expect(output.setTitle).toBeFunction()
  })

  it('should correctly define and set the inputted title for the output object', () => {
    const title = 'Ark'
    output.setTitle(title)
    expect(output.title).toBeDefined()
    expect(output.title).toBe(title)
  })
})

describe('output.__formatBalance', () => {
  it('should be a function', () => {
    expect(output.__formatBalance).toBeFunction()
  })

  it('should return a correctly formatted balance', () => {
    const amount = 110000000
    const currencySymbol = 'Ѧ'
    output.setCurrencySymbol(currencySymbol)
    expect(output.__formatBalance(amount)).toBe('Ѧ 1.1')
  })
})

describe('output.__showTable', () => {
  it('should be a function', () => {
    expect(output.__showTable).toBeFunction()
  })
})

describe('output.showError', () => {
  it('should be a function', () => {
    expect(output.showError).toBeFunction()
  })
})

describe('output.showOutput', () => {
  it('should be a function', () => {
    expect(output.showOutput).toBeFunction()
  })
})
