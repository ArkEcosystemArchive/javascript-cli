'use strict'
const Joi = require('joi')
const network = require('../../services/network')
const output = require('../../utils/output')
const networks = require('../../config/networks')
var workerpool = require('workerpool')
const schema = {
  vanity: Joi.string().required()
}

function __createVanityAddress (netVersion, vanity) {
  const bip39 = require('bip39')
  const arkecosystem = require('@arkecosystem/crypto')
  const arkCrypto = arkecosystem.crypto
  let passphrase
  let publicKey
  let address = ''

  while (address.toLowerCase().indexOf(vanity) === -1) {
    passphrase = bip39.generateMnemonic()
    publicKey = arkCrypto.getKeys(passphrase).publicKey
    address = arkCrypto.getAddress(publicKey, netVersion)
  }
  return { passphrase, address, publicKey }
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

    // Create the wallet
    const pool = workerpool.pool()
    const {passphrase, address, publicKey} = await pool.exec(__createVanityAddress, [network.network.version, vanity])
    pool.terminate()

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
