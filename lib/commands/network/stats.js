'use strict'

const network = require('../../services/network')
const output = require('../../utils/output')
const networks = require('../../config/networks')

/**
 * @dev Show network stats
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (cmd) => {
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

    // connect to the network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }

    await network.setNetwork(net)

    if (node) {
      await network.setServer(node)
    }
    await network.connect(net)

    // Retrieve network stats
    let status
    let commands = []
    commands.push(new Promise((resolve, reject) => {
      network.getFromNode('/api/node/configuration')
      .then((results) => {
        // Validate response
        if (!results.data.hasOwnProperty('success') || !results.data.success) {
          let errorMsg = results.data.hasOwnProperty('error') && results.data.error
            ? results.data.error : 'Failed to retrieve network status from node.'
            resolve()
          reject(new Error(errorMsg))
        }
        status = results.data.data
        delete status.ports
        delete status.feeStatistics
        delete status.constants.block
        delete status.constants.fees
        delete status.constants.height
        delete status.constants.dynamicOffsets
        resolve()
      })
      .catch(error => {
        reject(error)
      })
    }))
    await Promise.all(commands)

    // Prepare and show output
    output.setTitle(`ARK ${net} stats`)
    output.setCurrencySymbol(network.network.config.symbol)
    output.showOutput(status)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
