'use strict'

const Joi = require('joi')
const arkjs = require('arkjs')
const crypto = require('crypto')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const networks = require('../../config/networks')
const schema = {
  msg: Joi.string().required(),
  passphrase: Joi.string().required()
}

/**
 * @dev Sign <msg>.
 * @param {string} msg To sign
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (msg, cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
  let format = cmd.format ? cmd.format : 'json'
  let passphrase = cmd.passphrase ? cmd.passphrase : false

  // Surpres logging if not --verbose
  if (!cmd.verbose) {
    network.logger.info = () => { }
    network.logger.warn = () => { }
    network.logger.error = (err) => {
      output.showError(err)
    }
  }

  try {
    output.setFormat(format)

    // Prompt for optional input (passphrase and SmartBridge)
    const promptPassphrase = !cmd.passphrase || cmd.passphrase === true
    const inputResponse = await input.getPrompt(promptPassphrase, false)

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    // Validate input
    Joi.validate({
      msg,
      passphrase
    }, schema, (err) => {
      if (err) {
        throw new Error(err) // TDOD make error messages more userfriendly
      }
    })

    // Configure network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }
    await network.setNetwork(net)
    arkjs.crypto.setNetworkVersion(network.network.version)

    // Sign the Message
    let hash = crypto.createHash('sha256');
    hash = hash.update(Buffer.from(msg, 'utf-8')).digest()
    const publicKey = arkjs.crypto.getKeys(passphrase).publicKey
    const address = arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey)
    const signature = arkjs.crypto.getKeys(passphrase).sign(hash).toDER().toString('hex')

    const result = {
      publicKey,
      address,
      signature,
      message: msg
    }
    output.setTitle('ARK Sign message')
    output.showOutput(result)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
