'use strict'

const Joi = require('joi')
const crypto = require('../../utils/crypto')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const networks = require('../../config/networks')
const schema = {
  passphrase: Joi.string().required()
}

/**
 * @dev Get the address that is derived from a passphrase.
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
  let format = cmd.format ? cmd.format : 'json'
  let passphrase = cmd.passphrase ? cmd.passphrase : false

  try {
    output.setFormat(format)

    // Prompt for optional input (passphrase and SmartBridge)
    const promptPassphrase = !cmd.passphrase || cmd.passphrase === true
    const inputResponse = await input.getPrompt(promptPassphrase)

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    // Validate input
    Joi.validate({
      passphrase
    }, schema, (err) => {
      if (err) {
        throw new Error(err) // TODO make these clear error messages
      }
    })

    // Configure network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }
    await network.setNetwork(net)
    const networkVersion = network.network.version
    const {address, publicKey} = crypto.getAddress(passphrase, networkVersion)

    const addresOutput = {
      address,
      publicKey,
      passphrase
    }

    output.setTitle('ARK Address from passphrase')
    output.showOutput(addresOutput)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
