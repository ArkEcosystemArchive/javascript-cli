'use strict'

const network = require('../../lib/services/network')
const net = 'devnet'

class Mainnet {
  constructor () {
    this.network = network
  }

  async initNetwork () {
    await this.network.connect(net)
  }
}

module.exports = new Mainnet()
