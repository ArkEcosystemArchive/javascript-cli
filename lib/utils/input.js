'use strict'
const prompt = require('prompt')
const Joi = require('joi')
const axios = require('axios')
const chalk = require('chalk')
const ARKUnits = 100000000

prompt.message = chalk.blue.bold('ARK-JavaScript-CLI')

class Input {
  async getPrompt (passphrase, smartbridge) {
    if (!passphrase && !smartbridge) {
        return {}
    }

    let promptSchema = {
      'properties': {}
    }

    if (passphrase) {
      const passSchema = {
        passphrase: Joi.string().required()
      }
      promptSchema.properties.passphrase = {
        description: 'Enter your passphrase',
        type: 'string',
        message: chalk.red('Passphrase must be a string'),
        required: true,
        hidden: true,
        replace: '*',
        conform: function (value) {
          return Joi.validate({ passphrase: value }, passSchema, (err, value) => {
            if (err) {
              return false;
            }
            return true
          })
        }
      }
    }

    if (smartbridge) {
      const smartBridgeSchema = {
        smartbridge: Joi.string().max(64, 'utf8').allow('').required() // TODO AIP-11 255 chars
      }

      promptSchema.properties.smartbridge = {
        description: 'Enter your SmartBridge message',
        type: 'string',
        message: chalk.red('SmartBridge must be a string of no more than 64 characters.'), // TODO AIP-11 255 chars
        required: true,
        conform: function (value) {
          return Joi.validate({ smartbridge: value }, smartBridgeSchema, (err, value) => {
            if (err) {
              return false;
            }
            return true
          })
        }
      }
    }

    return new Promise((resolve, reject) => {
      prompt.start()
      prompt.get(promptSchema, (err, result) => {
        if (err) {
          reject(err)
        }
        return resolve(result)
      });
    })
  }


  async promptConfirmTransaction (message) {
    const promptSchema = {
      properties: {
        confirm: {
          description: 'Confirm your transaction',

          message,
          required: true,
          conform: function (value) {
            value = value.toLowerCase()
            if (value === 'yes' || value === 'y' || value === 'no' || value === 'n') {
              return true
            }
            return false
          },
          warning: chalk.red('Please respond with Y(es) or N(o)'),
          type: 'string',
          default: 'N'
        }
      }
    }
    return new Promise((resolve, reject) => {
      prompt.start()
      prompt.get(promptSchema, (err, result) => {
        if (err) {
          reject(err)
        }
        result.confirm = result.confirm.toLowerCase()
        if (result.confirm === 'yes' || result.confirm === 'y') {
          return resolve(true)
        }
        return resolve(false)
      });
    })
  }

  async amountToARK (amount) {
    try {
      // Check if the user wants to send a value in a currency
      const isCurrency = this.__parseAmountCurrency(amount)
      let exchangeRate = 1
      if (isCurrency) {
        exchangeRate = await this.__getARKTicker(isCurrency.currency)
        amount = isCurrency.value
      }

      // Check if user used an international format for the amount (e.g. 1,6 instead of 1.6)
      amount = this.__formatNumberFloat(amount)
      let value = parseInt(amount * ARKUnits * exchangeRate, 10)

      if (!Number.isSafeInteger(value)) {
        throw new RangeError('Amount is too large, causing an overflow.')
      }
      return value
    } catch (error) {
      throw error
    }
  }

  __parseAmountCurrency (amount) {
    if (typeof (amount) === 'number') {
      return false
    }
    const currencies = ['USD', 'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'HKD', 'IDR', 'INR', 'JPY', 'KRW', 'MXN', 'RUB']
    let value, currency

    for (let i in currencies) {
      if (amount.startsWith(currencies[i])) {
        currency = currencies[i]
        value = amount.replace(currency, '')
        return {currency, value}
      }
    }
  }

  __formatNumberFloat (number) {
    // Test if the number is formatted internationally
    // Eg 1.5 vs 1,5
    const commas = number.toString().split(',').length - 1
    const dots = number.toString().split('.').length - 1

    if (commas === 0 && (dots === 0 || dots === 1)) {
      // All good
      return parseFloat(number)
    }

    if (commas === 1 && dots === 0) {
      // International number format
      return parseFloat(number.toString().replace(/[,]/, '.'))
    }

    // Always wrong
    throw new RangeError('Amount formatted incorrectly. Correct <amount> format examples: 10, USD10.4, EUR10000, 10000.4')
  }

  async __getARKTicker (currency) {
    currency = currency.toLowerCase().trim()
    let url = 'https://api.coinmarketcap.com/v1/ticker/ark/'
    return axios.get(url, {
      params: {
        convert: currency
      }
    }).then(response => {
      if (response.data[0].hasOwnProperty(`price_${currency}`)) {
        return parseFloat(response.data[0][`price_${currency}`])
      }
      throw new Error(`Could not retrieve exchange rate for ${currency.toUpperCase()}`)
    }).catch(error => {
      throw error
    })
  }
}
module.exports = new Input()
