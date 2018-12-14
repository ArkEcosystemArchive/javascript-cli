'use strict'

const Joi = require('joi')
const crypto = require('../../utils/crypto')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const accountUtils = require('../../utils/account')
const networks = require('../../config/networks')
const ledger = require('../../ledger/ledger')
const schema = {
  passphrase: Joi.string().required(),
  secondSecret: Joi.string().allow('').optional(),
  fee: Joi.number().integer().min(1).optional()
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
  let secondSecret = cmd.signature ? cmd.signature : null
  let fee = cmd.fee ? parseInt(cmd.fee, 10) : 100000000

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
      passphrase,
      secondSecret: _secondSecret,
      fee
    }, schema, (err) => {
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
    }
    await network.connect(net)

    // Retreive the address for the current passphrase or Ledger address
    let address, i
    if (cmd.ledger) {
       // Initialize the ledger
      ledger.setNetwork(network)
      await ledger.connect()

      // Retrieve all wallets from the Ledger
      let wallets = await ledger.getBip44Accounts()

      // Select which wallet to use
      i = await input.getLedgerWallet(wallets)
      address = wallets[i].address
    } else {
      const account = accountUtils.getAccountFromSeed(passphrase, network.network.version)
      address = account.address
    }
    // Retreive the currently voted delegate
    const delegate = await accountUtils.getDelegate(network, address)

    // Create the voting transaction
    const transaction = crypto.createVoteTransaction(delegate.publicKey, passphrase, secondSecret, fee, true)

    // Execute the transaction
    if (interactive) {
      // Promt to confirm transaction
      const message = `Removing vote for ${delegate.username} now. Are you sure? Y(es)/N(o)`
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

      delete transaction.signature
      delete transaction.id

      // Select which wallet to use
      let i = await input.getLedgerWallet(wallets)
      let path = `44'/${network.network.slip44}'/${i}'/0/0`
      let publicKey = wallets[i].publicKey
      let address = wallets[i].address
      transaction.senderPublicKey = publicKey
      transaction.recipientId = address
      let signature = await ledger.signTransaction(path, transaction)
      transaction.signature = signature
      transaction.id = crypto.getTransactionId(transaction)
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
        'delegate': delegate.username,
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
