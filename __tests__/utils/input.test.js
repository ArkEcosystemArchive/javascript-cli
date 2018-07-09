'use strict'

const input = require('../../lib/utils/input.js')

describe('input', () => {
  it('should be defined', () => {
    expect(input).toBeDefined()
  })
})

describe('input.getPrompt', () => {
  it('should be a function', () => {
    expect(input.getPrompt).toBeFunction()
  })

  it('should return {} when no prompts have been specified', async () => {
    const passphrase = false
    const smartbridge = false
    const signature = false
    const emptyResult = {}
    const response = await input.getPrompt(passphrase, smartbridge, signature)
    expect(response).toEqual(emptyResult)
  })
})

describe('input.promptConfirmTransaction', () => {
  it('should be a function', () => {
    expect(input.promptConfirmTransaction).toBeFunction()
  })
})

describe('input.amountToARK', () => {
  it('should be a function', () => {
    expect(input.amountToARK).toBeFunction()
  })

  it('should return the correct ARKToshi value when inputting the amount in ARK', async () => {
    let amount = '1'
    let response = await input.amountToARK(amount)
    expect(response).toBe(100000000)

    amount = '1.1'
    response = await input.amountToARK(amount)
    expect(response).toBe(110000000)

    amount = '1,1'
    response = await input.amountToARK(amount)
    expect(response).toBe(110000000)
  })

  it('should accept an amount in one of the predefined fiat currency and return the correct value in ARKToshi', async () => {
    const amount = '1 USD'
    const response = await input.amountToARK(amount)
    expect(response).toBeGreaterThan(0)
  })

  it('should throw a RangeError when inputted amount is 0', async () => {
    let amount = '0'
    try {
      await input.amountToARK(amount)
      throw new Error('Should fail and go to catch')
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError)
    }

    amount = '0 USD'
    try {
      await input.amountToARK(amount)
      throw new Error('Should fail and go to catch')
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError)
    }
  })

  it('should throw a RangeError if inputted amount is causing an overflow', async () => {
    const amount = Math.pow(2, 53)

    try {
      await input.amountToARK(amount)
      throw new Error('Should fail and go to catch')
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError)
    }
  })

  it('should throw a RangeError if calculated ARKToshi value is not a safe integer', async () => {
    const amount = 100000000 // sorry whales, you can't send 100.000.000 ARK in 1 transaction. Blame JavaScript.

    try {
      await input.amountToARK(amount)
      throw new Error('Should fail and go to catch')
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError)
    }
  })
})

describe('input.getLedgerWallet', () => {
  it('should be a function', () => {
    expect(input.getLedgerWallet).toBeFunction()
  })
})

describe('input.__parseAmountCurrency', () => {
  it('should be a function', () => {
    expect(input.__parseAmountCurrency).toBeFunction()
  })

  it('should return false for number values as input', () => {
    const integer = 1
    const float = 1.1

    expect(input.__parseAmountCurrency(integer)).toBeFalsy()
    expect(input.__parseAmountCurrency(float)).toBeFalsy()
  })

  it('should return false for unknown currency input', () => {
    const currency = '1 WRONG'
    expect(input.__parseAmountCurrency(currency)).toBeFalsy()
  })

  it('should return an object with the currency and value split for accepted currencies', () => {
    const usd = 'USD 1.1'
    const usdLowerCase = 'usd 1.1'
    const usdInverse = '1.1 USD'
    const usdResult = {currency: 'USD', value: '1.1'}
    expect(input.__parseAmountCurrency(usd)).toMatchObject(usdResult)
    expect(input.__parseAmountCurrency(usdLowerCase)).toMatchObject(usdResult)
    expect(input.__parseAmountCurrency(usdInverse)).toMatchObject(usdResult)
  })
})

describe('input.__formatNumberFloat', () => {
  it('should be a function', () => {
    expect(input.__formatNumberFloat).toBeFunction()
  })

  it('should return a float for a correctly formatted number string input', () => {
    const correctInteger = '1'
    const correctFloat = '1.1'
    expect(input.__formatNumberFloat(correctInteger)).toBe(parseFloat(correctInteger))
    expect(input.__formatNumberFloat(correctFloat)).toBe(parseFloat(correctFloat))
  })

  it('Should return a float for an internationally formatted number string input (1,1 instead of 1.1)', () => {
    const correctFloat = 1.1
    const internationalFloat = '1,1'
    expect(input.__formatNumberFloat(internationalFloat)).toBe(correctFloat)
  })

  it('should throw a RangeError for badly formatted input', () => {
    let badInput = 'notANumber'
    expect(() => {
      input.__formatNumberFloat(badInput)
    }).toThrow()

    badInput = '1.000.000'
    expect(() => {
      input.__formatNumberFloat(badInput)
    }).toThrow()
  })
})

describe('input.__getARKTicker', () => {
  it('should be a function', () => {
    expect(input.__getARKTicker).toBeFunction()
  })

  it('should return an exchange rate for accepted currencies', async () => {
    const currency = 'USD'
    const exchangeRate = await input.__getARKTicker(currency)
    expect(exchangeRate).toBeGreaterThan(0)
  })

  it('should throw an URIError for unknown currencies', async () => {
    const currency = 'noCurrency'
    try {
      await input.__getARKTicker(currency)
      throw new Error('Should fail and go to catch')
    } catch (error) {
      expect(error).toBeInstanceOf(URIError)
    }
  })
})
