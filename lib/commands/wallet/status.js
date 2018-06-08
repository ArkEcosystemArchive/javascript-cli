'use strict'

const Joi = require('joi')
const network = require('../../services/network')
const output = require('../../utils/output')
const accountUtils = require('../../utils/account')
const networks = require('../../config/networks')
const schema = {
  address: Joi.string().length(34).required()
}

/**
 * @dev Get the status for an address from the network
 * @param {string} address The address to request the status of.
 * @param {array} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (address, cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
  let node = cmd.node ? cmd.node : null
  let format = cmd.format ? cmd.format : 'json'

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

    // Validate input
    Joi.validate({ address: address }, schema, (err, value) => {
      if (err) {
        throw new Error('Please enter a valid formatted address.')
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

    // Retrieve wallet status && which delegate is voted for (request them parrallelly)
    let wallet
    let commands = []
    commands.push(new Promise((resolve, reject) => {
      network.getFromNode(`/api/accounts?address=${address}`)
      .then((results) => {
        // Validate response
        if (!results.data.hasOwnProperty('success') || !results.data.success) {
          let errorMsg = results.data.hasOwnProperty('error') && results.data.error
            ? results.data.error : 'Failed to retrieve wallet status from node.'
          reject(new Error(errorMsg))
        }
        wallet = results.data.account
        resolve()
      })
      .catch(error => {
        reject(error)
      })
    }))

    let delegate
    commands.push(new Promise((resolve, reject) => {
      accountUtils.getDelegate(network, address)
      .then((results) => {
        if (!results.hasOwnProperty('username')) {
          delegate = '-'
        } else {
          delegate = results.username
        }
        resolve()
      })
      .catch(error => {
        reject(error)
      })
    }))
    await Promise.all(commands)

    // Add delegate information to output
    wallet.delegate = delegate;

    // Show output
    output.setTitle('ARK Wallet status')
    output.setCurrencySymbol(network.network.config.symbol)
    output.showOutput(wallet)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}