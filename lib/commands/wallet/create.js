'use strict'

const crypto = require('../../utils/crypto')
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

  try {
    output.setFormat(format)

    // Configure network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }
    await network.setNetwork(net)

    // Create the wallet
    const passphrase = require('bip39').generateMnemonic()
    const networkVersion = network.network.version
    const {address, publicKey} = crypto.getAddress(passphrase, networkVersion)

    const result = {
      address,
      publicKey,
      passphrase
    }
    output.setTitle('ARK Create wallet')
    output.showOutput(result)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
