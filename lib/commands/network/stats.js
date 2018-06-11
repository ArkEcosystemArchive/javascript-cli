'use strict'

const network = require('../../services/network')
const output = require('../../utils/output')
const networks = require('../../config/networks')

/**
 * @dev Show network stats
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 */
module.exports = async (cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
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
      // The network.connect method skips network config when a server and network have been defined already
      const response = await network.getFromNode('/api/loader/autoconfigure')
      network.network.config = response.data.network
    }
    await network.connect(net)

    // Retrieve network stats
    let status
    let commands = []
    commands.push(new Promise((resolve, reject) => {
      network.getFromNode('/api/blocks/getStatus')
      .then((results) => {
        // Validate response
        if (!results.data.hasOwnProperty('success') || !results.data.success) {
          let errorMsg = results.data.hasOwnProperty('error') && results.data.error
            ? results.data.error : 'Failed to retrieve network status from node.'
            resolve()
          reject(new Error(errorMsg))
        }
        status = results.data
        delete status.success
        delete status.fee // will be set by fees.send
        resolve()
      })
      .catch(error => {
        reject(error)
      })
    }))

    let fees
    commands.push(new Promise((resolve, reject) => {
      network.getFromNode('/api/blocks/getFees')
      .then((results) => {
        // Validate response
        if (!results.data.hasOwnProperty('success') || !results.data.success) {
          let errorMsg = results.data.hasOwnProperty('error') && results.data.error
            ? results.data.error : 'Failed to retrieve network fees from node.'
            resolve()
          reject(new Error(errorMsg))
        }
        fees = results.data
        delete fees.success
        resolve()
      })
      .catch(error => {
        reject(error)
      })
    }))

    let delegatesCount
    commands.push(new Promise((resolve, reject) => {
      network.getFromNode('/api/delegates/count')
      .then((results) => {
        // Validate response
        if (!results.data.hasOwnProperty('success') || !results.data.success) {
          let errorMsg = results.data.hasOwnProperty('error') && results.data.error
            ? results.data.error : 'Failed to retrieve network delegates count from node.'
            resolve()
          reject(new Error(errorMsg))
        }
        delegatesCount = results.data.count
        resolve()
      })
      .catch(error => {
        reject(error)
      })
    }))
    await Promise.all(commands)

    // Prepare and show output
    for (let item in fees) {
      status[item] = fees[item]
    }
    status['delegates count'] = delegatesCount

    output.setTitle(`ARK ${net} stats`)
    output.setCurrencySymbol(network.network.config.symbol)
    output.showOutput(status)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
