'use strict'

const arkjs = require('arkjs')
const Joi = require('joi')
const network = require('../../services/network')
const output = require('../../utils/output')
const networks = require('../../config/networks')
var workerpool = require('workerpool')
const schema = {
  vanity: Joi.string().required()
}

function __createVanityAddress (netVersion, vanity) {
  const arkjs = require('arkjs')
  const bip39 = require('bip39')
  let passphrase
  let address = ''
  arkjs.crypto.setNetworkVersion(netVersion)

  while (address.toLowerCase().indexOf(vanity) === -1) {
    passphrase = bip39.generateMnemonic()
    address = arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey)
  }
  return passphrase
}

/**
 * @dev Create a new wallet containing lowercase <vanity>.
 * @param {object} cmd A JSON object containing the options for this query (network, format, vanity).
 */
module.exports = async (cmd) => {
  let net = cmd.network ? cmd.network : 'mainnet'
  let format = cmd.format ? cmd.format : 'json'

  try {
    output.setFormat(format)

    // Validate input
    const vanity = cmd.vanity.toLowerCase().trim()
    Joi.validate({
      vanity
    }, schema, (err) => {
      if (err) {
        throw new Error(err) // TDOD make error messages more userfriendly
      }
    })

    // Configure network
    if (!networks[net]) {
      throw new Error(`Unknown network: ${net}`)
    }
    await network.setNetwork(net)
    arkjs.crypto.setNetworkVersion(network.network.version)

    // Create the wallet
    const pool = workerpool.pool()
    const passphrase = await pool.exec(__createVanityAddress, [network.network.version, vanity])
    pool.terminate()

    const address = arkjs.crypto.getAddress(arkjs.crypto.getKeys(passphrase).publicKey)
    const wif = arkjs.crypto.getKeys(passphrase).toWIF()
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
