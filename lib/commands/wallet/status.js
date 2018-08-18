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
 * @param {object} cmd A JSON object containing the options for this query (network, node, format, verbose).
 * @param {boolean} passthrough Return the data instead of outputting it to the console
 */
module.exports = async (address, cmd, passthrough) => {
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
    Joi.validate({ address: address }, schema, (err) => {
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
    }
    await network.connect(net)

    if (!accountUtils.validateAddress(address, network.network.version)) {
      throw new Error(`This address is not valid on ${net}`)
    }

    // Retrieve wallet status && which delegate is voted for (request them parrallelly)
    let wallet
    let commands = []
    commands.push(new Promise((resolve, reject) => {
      network.getFromNode(`/api/wallets/${address}`)
      .then((results) => {
        // Validate response
        if (results === null || !results.hasOwnProperty('data') || !results.data.hasOwnProperty('data')) {
          // This wallet is PROBABLY not known by the network (e.g. has not received transactions)
          wallet = {
            status: 'Unused: wallet not yet known on the network.',
            address,
            balance: 0
          }
          resolve()
        } else {
          wallet = results.data.data
        }
        resolve()
      })
      .catch(error => {
        reject(error)
      })
    }))

    let delegate = '-'
    commands.push(new Promise((resolve) => {
      accountUtils.getDelegate(network, address)
      .then((results) => {
        delegate = results
        resolve()
      })
      .catch((err) => {
        // if no delegate was voted for we do not need to throw
        network.logger.error(err)
        resolve()
      })
    }))
    await Promise.all(commands)

    // Add delegate information to output
    wallet.delegate = delegate;

    // Show output
    if (passthrough) {
      return wallet
    }

    output.setTitle('ARK Wallet status')
    output.setCurrencySymbol(network.network.config.symbol)
    output.showOutput(wallet)
  } catch (error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
