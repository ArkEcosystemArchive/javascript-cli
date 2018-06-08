'use strict'

const Joi = require('joi')
const arkjs = require('arkjs')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const accountUtils = require('../../utils/account')
const networks = require('../../config/networks')
const schema = {
  passphrase: Joi.string().required()
}

/**
 * @dev Unvote the corrently voted delegate.
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
  let node = cmd.node ? cmd.node : null
  let format = cmd.format ? cmd.format : 'json'
  let interactive = cmd.interactive ? cmd.interactive : false
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
    const inputResponse = await input.getPrompt(promptPassphrase, false)

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    // Validate input
    Joi.validate({
      passphrase
    }, schema, (err, value) => {
      if (err) {
        throw new Error('The passphrase must be a string.')
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

    // Retreive the address for the current passphrase
    const account = accountUtils.getAccountFromSeed(passphrase, network.network.version)

    // Retreive the currently voted delegate
    const delegates = await accountUtils.getDelegate(network, account.address)
    let delegate = [`-${delegates.publicKey}`]

    // Create the transaction
    arkjs.crypto.setNetworkVersion(network.network.version)
    const transaction = arkjs.vote.createVote(passphrase, delegate)

    // Execute the transaction
    if (interactive) {
      // Promt to confirm transaction
      const message = `Removing vote for ${delegates.username} now. Are you sure? Y(es)/N(o)`
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
        'delegate': delegates.username,
        transactionId
      }
      output.setTitle('ARK Unvote delegate')
      output.showOutput(result)
      return
    }

    throw new Error('Did not receive a transactionId, check status in wallet.')
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
