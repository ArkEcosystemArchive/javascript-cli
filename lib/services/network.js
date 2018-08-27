const axios = require('axios')
// const arkjs = require('arkjs')
const isUrl = require('is-url')
const isReachable = require('is-reachable')
const { sample, orderBy } = require('lodash')
const logger = require('./logger')
const networks = require('../config/networks')

class Network {
  async setNetwork (network) {
    try {
      this.network = networks[network]
      await this.__loadRemotePeers()
      return this.network
    } catch (err) {
      logger.error(err)
      return false
    }
  }

  async connect (network) {
    if (typeof (this.network) === 'undefined' || !this.network.name || this.network.name !== network) {
      this.setNetwork(network)
    }

    if (typeof (this.server) === 'undefined') {
      await this.findAvailablePeers()
      this.setServer()
    }

    try {
      const response = await this.getFromNode('/api/v2/node/configuration')
      if (response === null) {
        throw new Error('Can not read node configuration')
      }
      this.network.config = response.data.data
    } catch (error) {
      logger.error(error)
      return this.connect(network)
    }
  }

  async setServer (server) {
    if (!server) {
      server = await this.__getRandomPeer()
    }

    this.server = server
    return this.server
  }

  async __getRandomPeer () {
    if (typeof (this.network) === 'undefined') {
      return false
    }
    await this.__loadRemotePeers()

    return sample(this.network.peers)
  }

  async findAvailablePeers () {
    try {
      const response = await this.getFromNode('/api/v2/peers')

      let peers = this.__filterPeers(response.data.data)

      if (process.env.NODE_ENV === 'test') {
        peers = peers.slice(0, 10)
      }

      let commands = []
      let responsivePeers = []
      let queue = 0
      for (let i = 0; i < peers.length; i++) {
        const reachable = await isReachable(peers[i])
        if (reachable) {
          // Poll all peers parralelly: this saves yuuuge time
          if (typeof (commands[queue]) === 'undefined') {
            commands[queue] = []
          }

          commands[queue].push(new Promise((resolve, reject) => {
            this.__getNodeAPIConfig(peers[i])
            .then(async (nodeAPI) => {
              if (nodeAPI.hasOwnProperty('enabled') && nodeAPI.enabled === true && nodeAPI.hasOwnProperty('port')) {
                let node = peers[i].split(':')
                node = `${node[0]}:${nodeAPI.port}`
                const reachable = await isReachable(node)
                if (reachable) {
                  logger.info(`Responsive peer added: ${node}`)
                  responsivePeers.push(node)
                }
              }
              resolve()
            })
            .catch(error => {
              reject(error)
            })
          }))

          let queueLength = commands[queue].length
          if (queueLength % 20 === 0) {
            // Next block
            queue++
          }
        }
      }

      for (let i = 0; i < commands.length; i++) {
        await Promise.all(commands[i])
      }

      if (responsivePeers.length === 0) {
        throw new Error('Could not update responsive peers')
      }

      this.network.peers = responsivePeers
      logger.info(`Updated responsive peers: ${responsivePeers.length}`)
      return responsivePeers.length
    } catch (error) {
      logger.error(error)
    }
    return false
  }

  __filterPeers (peers) {
    let filteredPeers = peers
      .filter(peer => peer.status === 'OK')
      .filter(peer => peer.ip !== '127.0.0.1')

    filteredPeers = orderBy(filteredPeers, ['version', 'latency'], ['desc', 'asc'])
    filteredPeers = filteredPeers
        .map(peer => (`${peer.ip}:${peer.port}`))
    return filteredPeers
  }

  async getFromNode (url, params = {}, peer = null) {
    try {
      const result = await this.getFromNodeAPI(url, params, peer)
      return result
    } catch (error) {
      logger.warn(error)
    }
  }

  async getFromNodeAPI (url, params = {}, peer = null) {
    if (!this.peer && !this.server) {
      await this.setServer()
    }

    peer = await this.__selectResponsivePeer(peer || this.server)
    let uri
    if (!url.startsWith('http')) {
      uri = `http://${peer}${url}`
    }

    let networkName = this.network ? this.network.name : 'unknown network'
    try {
      logger.info(`Sending request on "${networkName}" to "${uri}"`)

      return axios.get(uri, {
        params,
        headers: {
          'API-Version': 2
        }
      }).catch(err => {
        logger.warn(`${err.message} for ${uri}`)
        return null
      })
    } catch (error) {
      logger.error(error)
    }
  }

  async postTransaction (transaction, peer) {
    const server = peer || this.server

    return axios.post(`http://${server}/api/v2/transactions`, {
      transactions: [transaction]
    }, {
      headers: {
        'API-Version': 2
      }
    })
  }

  async broadcast (transaction) {
    const peers = this.network.peers.slice(0, 20)

    for (let i = 0; i < peers.length; i++) {
      logger.info(`Broadcasting to ${peers[i]}`)

      await this.postTransaction(transaction, peers[i])
    }
  }

  async __loadRemotePeers () {
    if (isUrl(this.network.peers)) {
      const response = await axios.get(this.network.peers)
      this.network.peers = []
      const peers = response.data.map(peer => `${peer.ip}:${peer.port}`)

      for (let item in peers) {
        const node = peers[item]
        const nodeAPI = await this.__getNodeAPIConfig(node)
        if (nodeAPI.hasOwnProperty('enabled') && nodeAPI.enabled === true && nodeAPI.hasOwnProperty('port')) {
          let node = peers[item].split(':')
          node = `${node[0]}:${nodeAPI.port}`
          const reachable = await isReachable(node)
          if (reachable) {
            this.network.peers.push(node)
          }
        }
      }
    }
  }

  async __getNodeAPIConfig (node) {
    const uri = `http://${node}/config`
    try {
      const response = await axios.get(uri)
      const APIConfig = response.data.data.plugins['@arkecosystem/core-api']
      return APIConfig
    } catch (error) {
      return {enabled: false}
    }
  }

  async __selectResponsivePeer (peer) {
    const reachable = await isReachable(peer)

    if (!reachable) {
      logger.warn(`${peer} is unresponsive. Choosing new peer.`)

      const randomPeer = await this.__getRandomPeer()

      return this.__selectResponsivePeer(randomPeer)
    }

    return peer
  }
}

module.exports = new Network()
module.exports.logger = logger
