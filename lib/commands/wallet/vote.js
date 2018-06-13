'use strict'

const Joi = require('joi')
const arkjs = require('arkjs')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const accountUtils = require('../../utils/account')
const networks = require('../../config/networks')
const ledger = require('../../ledger/ledger')
const schema = {
  delegate: Joi.string().required(),
  passphrase: Joi.string().required(),
  secondSecret: Joi.string().allow('').optional()
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
  let secondSecret = cmd.signature ? cmd.signature : null

  // Surpres logging if not --verbose
  if (!cmd.verbose) {
    network.logger.info = () => { }
    network.logger.warn = () => { }
    network.logger.error = (err) => {
      output.showError(err)
    }

    ledger.logger.info = () => { }
    ledger.logger.warn = () => { }
    ledger.logger.error = (err) => {
      output.showError(err)
    }
  }

  try {
    output.setFormat(format)

    let promptPassphrase, promptSignature
    if (!cmd.ledger) {
      // Prompt for optional input (passphrase and SmartBridge)
      promptPassphrase = !cmd.passphrase || cmd.passphrase === true
      promptSignature = cmd.signature === true
    } else {
      // Test if the Ledger is supported
      await ledger.isSupported()
      passphrase = 'pass'
      promptPassphrase = false
      promptSignature = false
    }

    // Prompt for optional input (passphrase and SmartBridge)
    const inputResponse = await input.getPrompt(promptPassphrase, promptSignature)

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    if (inputResponse.hasOwnProperty('signature')) {
      secondSecret = inputResponse.signature.toString()
    }

    // Validate input
    let _secondSecret = secondSecret === null ? '' : secondSecret
    Joi.validate({
      delegate,
      passphrase,
      secondSecret: _secondSecret
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
    const votetransaction = arkjs.vote.createVote(passphrase, newDelegate, secondSecret)

    // Execute the transaction
    if (interactive) {
      // Promt to confirm transaction
      const message = `Voting for ${validDelegate.username} now. Are you sure? Y(es)/N(o)`
      const confirm = await input.promptConfirmTransaction(message)
      if (!confirm) {
        throw new Error('Transaction cancelled by user.')
      }
    }

    if (cmd.ledger) {
      // Initialize the ledger
      ledger.setNetwork(network)
      await ledger.connect()

      // Retrieve all wallets from the Ledger
      let wallets = await ledger.getBip44Accounts()

      delete votetransaction.signature
      delete votetransaction.id

      // Select which wallet to use
      let i = await input.getLedgerWallet(wallets)
      let path = `44'/${network.network.slip44}'/${i}'/0/0`
      let publicKey = wallets[i].publicKey
      let address = wallets[i].address
      votetransaction.senderPublicKey = publicKey
      votetransaction.recipientId = address
      let signature = await ledger.signTransaction(path, votetransaction)
      votetransaction.signature = signature
      votetransaction.id = arkjs.crypto.getId(votetransaction)
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
