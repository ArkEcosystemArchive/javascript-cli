'use strict'

const Joi = require('joi')
const arkjs = require('arkjs')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const accountUtils = require('../../utils/account')
const networks = require('../../config/networks')
const schema = {
  delegate: Joi.string().required(),
  passphrase: Joi.string().required()
}

/**
 * @dev Vote for <delegate>.
 * @param {string} delegate The delegate to vote for
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (delegate, cmd) => {
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
      delegate,
      passphrase
    }, schema, (err, value) => {
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
      // The network.connect method skips network config when a server and network have been defined already
      const response = await network.getFromNode('/api/loader/autoconfigure')
      network.network.config = response.data.network
    }
    await network.connect(net)

    // Retreive the address for the current passphrase
    const account = accountUtils.getAccountFromSeed(passphrase, network.network.version)

    // Retreive the currently voted delegate and check if the to-vote-for delegate exists
    let currentDelegates = {username: '-'}
    try {
      currentDelegates = await accountUtils.getDelegate(network, account.address)
    } catch (err) {
      // No current voted delegate found, so nothing to do here
    }

    // Only place for 1 delegate to vote for, Let user unvote first
    // In the previous Ark-Client the current vote was automatically unvoted,
    // but imho it's better to throw and notify (maybe the user forgot he voted
    // and does not want to unvote at all, or has not enough balance to unvote and vote)
    if (currentDelegates.username !== '-') {
      if (currentDelegates.username === delegate) {
        throw new Error(`Already active vote for ${delegate}`)
      }
      throw new Error(`Can not vote for ${delegate}: Please unvote ${currentDelegates.username} first.`)
    }

    // Create the voting transaction
    const validDelegate = await accountUtils.isValidDelegate(network, delegate)
    let newDelegate = [`+${validDelegate.publicKey}`]
    arkjs.crypto.setNetworkVersion(network.network.version)
    const votetransaction = arkjs.vote.createVote(passphrase, newDelegate)

    // Execute the transaction
    if (interactive) {
      // Promt to confirm transaction
      const message = `Voting for ${validDelegate.username} now. Are you sure? Y(es)/N(o)`
      const confirm = await input.promptConfirmTransaction(message)
      if (!confirm) {
        throw new Error('Transaction cancelled by user.')
      }
    }

    const transactionResponse = await network.postTransaction(votetransaction)
    if (!transactionResponse.data.hasOwnProperty('success') || !transactionResponse.data.success) {
      let errorMsg = transactionResponse.data.hasOwnProperty('error') && transactionResponse.data.error
        ? transactionResponse.data.error : 'Failed to post vote transaction to the network.'
      throw new Error(errorMsg)
    }

    if (transactionResponse.data.hasOwnProperty('transactionIds') && transactionResponse.data.transactionIds.length) {
      // Broadcast the transaction
      try {
        await network.broadcast(votetransaction)
      } catch (err) {
        // Do nothing, we are only bradcasting
      }

      const transactionId = transactionResponse.data.transactionIds[0]
      const result = {
        delegate,
        transactionId
      }
      output.setTitle('ARK Vote delegate')
      output.showOutput(result)
      return
    }

    throw new Error('Did not receive a transactionId, check status in wallet.')
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
