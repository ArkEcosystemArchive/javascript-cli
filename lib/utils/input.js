'use strict'
const prompt = require('prompt')
const Joi = require('joi')

class Input {
  async getPrompt (passphrase, smartbridge) {
    if (!passphrase && !smartbridge) {
        return null
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
        message: 'Passphrase must be a string',
        required: true,
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
        message: 'SmartBridge must be a string of no more than 64 characters.', // TODO AIP-11 255 chars
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
}
module.exports = new Input()
