'use strict'

const Joi = require('joi')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const networks = require('../../config/networks')
const schema = {
  address: Joi.string().length(34).required(),
  smartbridge: Joi.string().max(64, 'utf8').allow('').optional(), // Change to 255 in v2
  passphrase: Joi.string().required(),
  amount: Joi.number().integer().min(1).required()
}

/**
 * @dev Send <amount> to <recepient>
 * @param {string} amount The amount to send (e.g. 1)
 * @param {recepient} address The address of the receiver of the transaction
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (amount, recepient, cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
  let node = cmd.node ? cmd.node : null
  let format = cmd.format ? cmd.format : 'json'
  let smartbridge = cmd.smartbridge ? cmd.smartbridge : ''
  let passphrase = cmd.passphrase ? cmd.passphrase : null

  // Surpres logging if not --verbose
  if (!cmd.verbose) {
    network.logger.info = (msg) => { }
    network.logger.warn = (msg) => { }
    network.logger.error = (err) => {
      output.showError(err)
    }
  }

  try {
    output.setFormat(format)

    // Prompt for optional input (passphrase and SmartBridge)
    const inputResponse = await input.getPrompt(cmd.passphrase, cmd.smartbridge)

    if (inputResponse.hasOwnProperty('smartbridge')) {
      smartbridge = inputResponse.smartbridge.toString()
    }

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    // Validate input
    Joi.validate({
      address: recepient,
      smartbridge: smartbridge,
      passphrase: passphrase,
      amount: amount
    }, schema, (err, value) => {
      if (err) {
        throw new Error(err)
      }
    })

    // connect to the network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }

    await network.setNetwork(net)

    if (node) {
      await network.setServer(node)
      // The network.connect method skips network config when a server and network have been defined already
      const response = await network.getFromNode('/api/loader/autoconfigure')
      network.network.config = response.data.network
    }
    await network.connect(net)

    // TODO everything
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
