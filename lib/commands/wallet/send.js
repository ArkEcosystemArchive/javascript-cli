'use strict'

const Joi = require('joi')
const arkjs = require('arkjs')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const networks = require('../../config/networks')
const ARKUnits = 100000000
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
  let interactive = cmd.interactive ? cmd.interactive : false
  let smartbridge = cmd.smartbridge ? cmd.smartbridge : ''
  let passphrase = cmd.passphrase ? cmd.passphrase : false

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
    const promptPassphrase = !cmd.passphrase || cmd.passphrase === true
    const promptSmartBridge = cmd.smartbridge === true
    const inputResponse = await input.getPrompt(promptPassphrase, promptSmartBridge)

    if (inputResponse.hasOwnProperty('smartbridge')) {
      smartbridge = inputResponse.smartbridge.toString()
    }

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    // Convert the amount to integer in ARK*100000000
    amount = await input.amountToARK(amount)

    // Validate input
    Joi.validate({
      address: recepient,
      smartbridge,
      passphrase,
      amount
    }, schema, (err, value) => {
      if (err) {
        throw new Error(err) // TODO make these clear error messages
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

    // Create the transaction
    arkjs.crypto.setNetworkVersion(network.network.version)
    const transaction = arkjs.transaction.createTransaction(recepient, amount, smartbridge, passphrase)

    // Execute the transaction
    if (interactive) {
      // Promt to confirm transaction
      const value = parseFloat(transaction.amount) / ARKUnits
      const message = `Sending ${network.network.config.symbol} ${value} to ${recepient} now. Are you sure? Y(es)/N(o)`
      const confirm = await input.promptConfirmTransaction(message)
      if (!confirm) {
        throw new Error('Transaction cancelled by user.')
      }
    }

    const transactionResponse = await network.postTransaction(transaction)
    if (!transactionResponse.data.hasOwnProperty('success') || !transactionResponse.data.success) {
      let errorMsg = transactionResponse.data.hasOwnProperty('error') && transactionResponse.data.error
        ? transactionResponse.data.error : 'Failed to post transaction to the network.'
      throw new Error(errorMsg)
    }


    if (transactionResponse.data.hasOwnProperty('transactionIds') && transactionResponse.data.transactionIds.length) {

      // Broadcast the transaction
      try {
        await network.broadcast(transaction)
      } catch (err) {
        // Do nothing, we are only bradcasting
      }

      const transactionId = transactionResponse.data.transactionIds[0]
      const result = {
        amount,
        recepient,
        smartbridge,
        transactionId
      }
      output.setTitle('ARK Send')
      output.setCurrencySymbol(network.network.config.symbol)
      output.showOutput(result)
      
      return
    }

    throw new Error('Did not receive a transactionId, check status in wallet.')
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}