const axios = require('axios')
const arkjs = require('arkjs')
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

      arkjs.crypto.setNetworkVersion(this.network.version)

      return this.network
    } catch (err) {
      logger.error(err)
      return false
    }
  }

  async setServer (server) {
    if (!server) {
      server = await this.__getRandomPeer()
    }

    this.server = server

    return this.server
  }

  async getFromNode (url, params = {}, peer = null) {
    const nethash = this.network ? this.network.nethash : null

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
          nethash,
          version: '2.0.0',
          port: 1
        }
      }).catch(err => {
        if (err.message === 'Request failed with status code 404') {
          // We are trying on the wrong API version
          let peerParts = peer.split(':')
          let port = peerParts[peerParts.length - 1]
          switch (port) {
            case '4003':
              if (this.network.name === 'devnet') {
                peerParts[peerParts.length - 1] = '4002' // Set devnet port
              } else if (this.network.name === 'mainnet') {
                peerParts[peerParts.length - 1] = '4001' // Set mainnet port
              }
              break;
            case '4001':
            case '4002':
            default:
              peerParts[peerParts.length - 1] = '4003' // Set the public API port
          }
          peer = peerParts.join(':')
          uri = `http://${peer}${url}`
          logger.info(`Sending request on "${networkName}" to "${uri}"`)
          return axios.get(uri, {
            params,
            headers: {
              nethash,
              version: '2.0.0',
              port: 1
            }
          })
        }
      })
    } catch (error) {
      logger.error(error)
    }
  }

  async findAvailablePeers () {
    try {
      const response = await this.getFromNode('/peer/list')

      let { networkHeight, peers } = this.__filterPeers(response.data.peers)
      
      if (process.env.NODE_ENV === 'test') {
        peers = peers.slice(0, 10)
      }

      let commands = []
      let responsivePeers = []
      let queue = 0
      for (let i = 0; i < peers.length; i++) {
        // Poll all peers parralelly: this saves yuuuge time
        if (typeof (commands[queue]) === 'undefined') {
          commands[queue] = []
        }

        commands[queue].push(new Promise((resolve, reject) => {
          this.getFromNode('/peer/status', {}, peers[i])
          .then((response) => {
            if (response.data.hasOwnProperty('success') && response.data.success === true) {
              responsivePeers.push(peers[i])
            }
            resolve()
          })
          .catch(error => {
            reject(error)
          })
        }))

        let queueLength = commands[queue].length
        if (queueLength % 10 === 0) {
          // Next block
          queue++
        }
      }

      for (let i = 0; i < commands.length; i++) {
        await Promise.all(commands[i])
      }

      if (responsivePeers.length === 0) {
        throw new Error('Could not update responsive peers')
      }

      this.network.peers = responsivePeers
      logger.info(`Updated responsive peers: ${responsivePeers.length} near height: ${networkHeight}`)
      return responsivePeers.length
    } catch (error) {
      logger.error(error)
    }
    return false
  }

  async postTransaction (transaction, peer) {
    const server = peer || this.server

    return axios.post(`http://${server}/peer/transactions`, {
      transactions: [transaction]
    }, {
      headers: {
        nethash: this.network.nethash,
        version: '1.0.0',
        port: 1
      }
    })
  }

  async broadcast (transaction) {
    const peers = this.network.peers.slice(0, 10)

    for (let i = 0; i < peers.length; i++) {
      logger.info(`Broadcasting to ${peers[i]}`)

      await this.postTransaction(transaction, peers[i])
    }
  }

  async connect (network) {
    if (this.server) {
      logger.info(`Server is already configured as "${this.server}"`)
    }

    if (this.network && this.network.name === network) {
      logger.info(`Network is already configured as "${this.network.name}"`)
    }

    const configured = this.server && this.network && (this.network.name && this.network.name === network)

    if (!configured) {
      this.setNetwork(network)
      this.setServer()

      await this.findAvailablePeers()

      try {
        const response = await this.getFromNode('/api/loader/autoconfigure')

        this.network.config = response.data.network
      } catch (error) {
        return this.connect(network)
      }
    }
  }

  async __getRandomPeer () {
    if (typeof (this.network) === 'undefined') {
      return false
    }
    await this.__loadRemotePeers()

    return sample(this.network.peers)
  }

  async __loadRemotePeers () {
    if (isUrl(this.network.peers)) {
      const response = await axios.get(this.network.peers)

      if (this.network.name === 'devnet') {
        const publicAPIPort = '4003'
        this.network.peers = response.data.map(peer => `${peer.ip}:${publicAPIPort}`)
      } else {
        this.network.peers = response.data.map(peer => `${peer.ip}:${peer.port}`)
      }
    }
  }

  __filterPeers (peers) {
    let filteredPeers = peers
      .filter(peer => peer.status === 'OK')
      .filter(peer => peer.ip !== '127.0.0.1')
      .filter(peer => Number.isSafeInteger(parseInt(peer.height, 10)))

    filteredPeers = orderBy(filteredPeers, ['height', 'delay'], ['desc', 'asc'])

    let networkHeight = 0
    let mostCommonHeightCount = 0
    let heightOccurances = []

    for (let item in filteredPeers) {
      let height = filteredPeers[item].height

      if (typeof (heightOccurances[height]) === 'undefined') {
        heightOccurances[height] = 1
      } else {
        heightOccurances[height]++
      }

      if (mostCommonHeightCount < heightOccurances[height]) {
        mostCommonHeightCount = heightOccurances[height]
        networkHeight = height
      }
    }

    return {
      networkHeight,
      peers: filteredPeers
        .filter(peer => Math.abs(peer.height - networkHeight) <= 10)
        .map(peer => (`${peer.ip}:${peer.port}`))
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
