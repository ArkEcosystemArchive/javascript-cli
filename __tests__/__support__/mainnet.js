'use strict'

const network = require('../../lib/services/network')
const net = 'devnet'

class Mainnet {
  async initNetwork () {
    this.network = network
    await this.network.connect(net)
  }
}

module.exports = new Mainnet()
