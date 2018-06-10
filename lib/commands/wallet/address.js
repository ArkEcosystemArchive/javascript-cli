'use strict'

const Joi = require('joi')
const arkjs = require('arkjs')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const networks = require('../../config/networks')
const wallet = require('./status')
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
    arkjs.crypto.setNetworkVersion(network.network.version)

    // Derive the wallet
    const wif = arkjs.crypto.getKeys(passphrase).toWIF()
    const address = arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey)

    let status = await wallet(address, cmd, true)
    status.seed = passphrase
    status.wif = wif

    output.setTitle('ARK Address from passphrase')
    output.setCurrencySymbol(network.network.config.symbol)
    output.showOutput(status)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
