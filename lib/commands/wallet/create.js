'use strict'

const arkjs = require('arkjs')
const network = require('../../services/network')
const output = require('../../utils/output')
const networks = require('../../config/networks')

/**
 * @dev Create a new wallet.
 * @param {object} cmd A JSON object containing the options for this query (network, format, verbose).
 */
module.exports = async (cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
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

    // Configure network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }
    await network.setNetwork(net)
    arkjs.crypto.setNetworkVersion(network.network.version)

    // Create the wallet
    const passphrase = require('bip39').generateMnemonic()
    const wif = arkjs.crypto.getKeys(passphrase).toWIF()
    const address = arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey)

    // TODO in v2 maybe we can send a 0-fee, 0 ARK transaction from this address to this address
    // and make it know to the network

    const result = {
      seed: passphrase,
      wif,
      address
    }
    output.setTitle('ARK Create wallet')
    output.showOutput(result)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
