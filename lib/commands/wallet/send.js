'use strict'

const Joi = require('joi')
const crypto = require('../../utils/crypto')
const network = require('../../services/network')
const output = require('../../utils/output')
const input = require('../../utils/input')
const networks = require('../../config/networks')
const ledger = require('../../ledger/ledger')
const ARKTOSHI = Math.pow(10, 8)
const schema = {
  address: Joi.string().length(34).required(),
  smartbridge: Joi.string().max(64, 'utf8').allow('').optional(), // Change to 255 in v2
  passphrase: Joi.string().required(),
  secondSecret: Joi.string().allow('').optional(),
  amount: Joi.number().integer().min(1).required(),
  fee: Joi.number().integer().min(1).optional()
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
  let secondSecret = cmd.signature ? cmd.signature : null
  let fee = cmd.fee ? parseInt(cmd.fee, 10) : 10000000

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

    const promptSmartBridge = cmd.smartbridge === true
    const inputResponse = await input.getPrompt(promptPassphrase, promptSignature, promptSmartBridge)

    if (inputResponse.hasOwnProperty('smartbridge')) {
      smartbridge = inputResponse.smartbridge.toString()
    }

    if (inputResponse.hasOwnProperty('passphrase')) {
      passphrase = inputResponse.passphrase.toString()
    }

    if (inputResponse.hasOwnProperty('signature')) {
      secondSecret = inputResponse.signature.toString()
    }

    // Convert the amount to integer in ARK*100000000
    amount = await input.amountToARK(amount)

    // Validate input
    let _secondSecret = secondSecret === null ? '' : secondSecret
    Joi.validate({
      address: recepient,
      smartbridge,
      passphrase,
      secondSecret: _secondSecret,
      amount,
      fee
    }, schema, (err) => {
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
    }
    await network.connect(net)

    // Execute the transaction
    if (interactive) {
      // Promt to confirm transaction
      const value = parseFloat(amount) / ARKTOSHI
      const message = `Sending ${network.network.config.symbol} ${value} to ${recepient} now. Are you sure? Y(es)/N(o)`
      const confirm = await input.promptConfirmTransaction(message)
      if (!confirm) {
        throw new Error('Transaction cancelled by user.')
      }
    }

    const transaction = crypto.createTransaction(recepient, amount, smartbridge, passphrase, secondSecret, fee)
    if (cmd.ledger) {
      // Initialize the ledger
      ledger.setNetwork(network)
      await ledger.connect()

      // Retrieve all wallets from the Ledger
      let wallets = await ledger.getBip44Accounts()

      delete transaction.signature
      delete transaction.id
      delete transaction.timestamp

      // Select which wallet to use
      let i = await input.getLedgerWallet(wallets)
      let path = `44'/${network.network.slip44}'/${i}'/0/0`
      let publicKey = wallets[i].publicKey
      transaction.senderPublicKey = publicKey
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
        // Do nothing, we are only broadcasting
      }

      const transactionId = transactionResponse.data.data.broadcast[0]
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
