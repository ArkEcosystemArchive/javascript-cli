'use strict'

const Joi = require('joi')
const crypto = require('../../utils/crypto')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const networks = require('../../config/networks')
const schema = {
  secondPassphrase: Joi.string().required(),
  passphrase: Joi.string().required(),
  fee: Joi.number().integer().min(1).optional()
}

/**
 * @dev Create a new second signature.
 * @param {string} secondSecret The second signature to create
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (secondPassphrase, cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
  let node = cmd.node ? cmd.node : null
  let format = cmd.format ? cmd.format : 'json'
  let interactive = cmd.interactive ? cmd.interactive : false
  let passphrase = cmd.passphrase ? cmd.passphrase : false
  let fee = cmd.fee ? parseInt(cmd.fee, 10) : 500000000

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

    // Prompt for optional input (passphrase and second signature)
    const promptSignature = typeof (secondPassphrase) === 'undefined'
    const promptPassphrase = !cmd.passphrase || cmd.passphrase === true
    const inputResponse = await input.getPrompt(promptPassphrase, promptSignature)

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    if (inputResponse.hasOwnProperty('signature')) {
      secondPassphrase = inputResponse.signature.toString()
    }

    // Validate input
    Joi.validate({
      secondPassphrase,
      passphrase,
      fee
    }, schema, (err) => {
      if (err) {
        throw new Error(err) // TDOD make error messages more userfriendly
      }
    })

    // connect to the network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }

    await network.setNetwork(net)

    if (node) {
      await network.setServer(node)
    }
    await network.connect(net)

    // Create register transaction
    const transaction = crypto.createignatureTransaction(passphrase, secondPassphrase, fee)

    // Execute the transaction
    if (interactive) {
      // Promt to confirm transaction
      const message = `Creating second signature: ${secondPassphrase} now. Are you sure? Y(es)/N(o)`
      const confirm = await input.promptConfirmTransaction(message)
      if (!confirm) {
        throw new Error('Transaction cancelled by user.')
      }
    }

    const transactionResponse = await network.postTransaction(transaction)
    if (!transactionResponse.data.hasOwnProperty('data')) {
      throw new Error('Failed to post transaction to the network.')
    }

    if (transactionResponse.data.data.hasOwnProperty('broadcast') && transactionResponse.data.data.broadcast.length) {
      // Broadcast the transaction
      try {
        await network.broadcast(transaction)
      } catch (err) {
        // Do nothing, we are only bradcasting
      }

      const transactionId = transactionResponse.data.data.broadcast[0]
      const result = {
        'signature': secondPassphrase,
        transactionId
      }
      output.setTitle('ARK Create second signature')
      output.showOutput(result)
      return
    }

    throw new Error('Did not receive a transactionId, check status in wallet.')
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
