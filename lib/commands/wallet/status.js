'use strict'

const Joi = require('joi')
const network = require('../../services/network')
const output = require('../../utils/output')
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
    network.logger.info=(msg) => {return}
    network.logger.warn=(msg) => {return}
    network.logger.error=(err) => {
      output.showError(err)
    }
  }
  
  try{
    // Validate input
    Joi.validate({ address: address }, schema, (err, value) => {
      if(err) {
        throw new Error("Please enter a valid formatted address.")
      }
    })
    
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
    
    // Retrieve wallet status
    let response = await network.getFromNode(`/api/accounts?address=${address}`)
   
    // Validate response
    if (!response.data.hasOwnProperty('success') || !response.data.success) {
      let errorMsg = response.data.hasOwnProperty('error') && response.data.error 
        ? response.data.error : "Failed to retrieve wallet status from node."
      throw new Error(errorMsg)  
    }
    
    // Show output
    output.showOutput(response.data.account)
  } 
  catch(error) {
    output.showError(error.message)
    process.exitCode = 1
  }
}
