'use strict'
const Table = require('ascii-table')
const logger = require('../services/logger')
const chalk = require('chalk')
const ARKUnits = 100000000

class Output {
    
  setFormat(format){
    switch (format) {
      case "table":
        this.format="table"
        break
      case "json":
        this.format="json"
        break
      default:
        throw new Error("Unknown output format")
      }
      return this.format;
  }
    
  setCurrencySymbol(symbol){
    this.symbol = symbol
  }

  showOutput(data){
    if(typeof(this.format) !== 'undefined' && this.format === 'table') {
      this.__showTable(data)      
      return    
    }
        
    // default to JSON output
    let formattedData = JSON.stringify(data)
    console.log(formattedData)
    return
  }
    
  showError(error){
    if(typeof(this.format) !== 'undefined' && this.format === 'table') {
      logger.error(error)      
      return    
    }
    
    // default to JSON output
    let errorOutput = {
      'success': false,
      'error': error
    }
    console.log(chalk.red(JSON.stringify(errorOutput)))
    return
  }
  
  __showTable(data){
    // TODO implement ASCII Table output
    console.log("Hello World")
  }
}
module.exports = new Output()