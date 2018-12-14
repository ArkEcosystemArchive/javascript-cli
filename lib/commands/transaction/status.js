'use strict'

const Joi = require('joi')
const network = require('../../services/network')
const output = require('../../utils/output')
const networks = require('../../config/networks')
const schema = {
  transactionId: Joi.string().length(64).required()
}

/**
 * @dev Get the status for a transaction from the network
 * @param {string} transactionId The Transaction Id to request the status of.
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 * @param {boolean} passthrough Return the data instead of outputting it to the console
 */
module.exports = async (transactionId, cmd, passthrough) => {
  let net = cmd.network ? cmd.network : 'devnet'
  let node = cmd.node ? cmd.node : null
  let format = cmd.format ? cmd.format : 'json'

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

    // Validate input
    Joi.validate({ transactionId }, schema, (err) => {
      if (err) {
        throw new Error('Please enter a valid formatted transaction Id.')
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

    // Retrieve transaction status
    let transaction
    const results = await network.getFromNode(`/api/v2/transactions/${transactionId}`)
    if (results === null || !results.hasOwnProperty('data') || !results.data.hasOwnProperty('data')) {
      transaction = {
        status: 'Transaction not yet known on the network.'
      }
    } else {
      transaction = results.data.data
    }

    // Show output
    if (passthrough) {
      return transaction
    }

    output.setTitle('ARK Transaction status')
    output.setCurrencySymbol(network.network.config.symbol)
    output.showOutput(transaction)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
