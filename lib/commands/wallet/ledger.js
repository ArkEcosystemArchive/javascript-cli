'use strict'

const network = require('../../services/network')
const output = require('../../utils/output')
const networks = require('../../config/networks')
const ledger = require('../../ledger/ledger')

/**
 * @dev Get the status for an address on the ledger
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

    ledger.logger.info = () => { }
    ledger.logger.warn = () => { }
    ledger.logger.error = (err) => {
      output.showError(err)
    }
  }

  try {
    output.setFormat(format)

    // Test if the Ledger is supported
    await ledger.isSupported()

    // connect to the network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }

    await network.setNetwork(net)

    if (node) {
      await network.setServer(node)
    }
    await network.connect(net)

    // Initialize the ledger
    ledger.setNetwork(network)
    await ledger.connect()

    let wallets = await ledger.getBip44Accounts()

    // Show output
    output.setTitle('ARK Ledger wallet status')
    output.setCurrencySymbol(network.network.config.symbol)
    output.showOutput(wallets)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
