'use strict'
const Table = require('ascii-table')
const logger = require('../services/logger')
const chalk = require('chalk')
const ARKUnits = 100000000

class Output {
  setFormat (format) {
    switch (format) {
      case 'table':
        this.format = 'table'
        break
      case 'json':
        this.format = 'json'
        break
      default:
        throw new Error('Unknown output format')
      }
      return this.format;
  }

  setCurrencySymbol (symbol) {
    this.symbol = symbol
  }

  showOutput (data) {
    if (typeof (this.format) !== 'undefined' && this.format === 'table') {
      this.__showTable(data)
      return
    }

    // default to JSON output
    let formattedData = JSON.stringify(data)
    console.log(chalk.blue(formattedData))
  }

  showError (error) {
    if (typeof (this.format) !== 'undefined' && this.format === 'table') {
      logger.error(error)
      return
    }

    // default to JSON output
    let errorOutput = {
      'success': false,
      'error': error
    }
    console.log(chalk.red(JSON.stringify(errorOutput)))
  }

  setTitle (title) {
    this.title = title
  }

  __showTable (data) {
    let title = typeof (this.title) !== 'undefined' ? this.title : 'ARK CLI'
    let table = new Table(title)

    if (data.hasOwnProperty('balance')) {
        data.balance = this.__formatBalance(data.balance);
    }

    if (data.hasOwnProperty('unconfirmedBalance')) {
        data.unconfirmedBalance = this.__formatBalance(data.unconfirmedBalance);
    }

    for (let item in data) {
        if (data[item] && data[item].length) {
            table.addRow(item, data[item]);
        }
    }

    console.log(chalk.blue(table.toString()))
  }

  __formatBalance (amount) {
    let balance = amount / ARKUnits;
    let symbol = typeof (this.symbol) !== 'undefined' ? `${this.symbol} ` : ''
    return `${symbol}${balance}`;
  }
}
module.exports = new Output()
