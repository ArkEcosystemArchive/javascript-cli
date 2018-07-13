'use strict'

const network = require('../../lib/services/network')
const net = 'mainnet'

class Mainnet {
  async initNetwork () {
    network.logger.info = () => { }
    network.logger.warn = () => { }
    network.logger.error = () => { }

    this.network = network
    await this.network.setNetwork(net)
  }
}

module.exports = new Mainnet()
