'use strict'

const network = require('../../lib/services/network.js')
network.logger.info = () => { }
network.logger.warn = () => { }
network.logger.error = () => { }

describe('network', () => {
  it('should be an object', () => {
    expect(network).toBeObject()
  })
})

describe('network.setNetwork', () => {
  it('should be a function', () => {
    expect(network.setNetwork).toBeFunction()
  })

  it('should return false if a non-exisitng network is set', async () => {
    const badNet = 'noNetwork'
    let result = await network.setNetwork(badNet)
    expect(result).toBeFalse()

    result = await network.setNetwork()
    expect(result).toBeFalse()
  })

  it('should return a network object for the network that was set', async () => {
    const net = 'mainnet'
    const result = await network.setNetwork(net)
    const keys = ['name', 'nethash', 'peers', 'version', 'slip44']
    expect(result).toBeObject()
    expect(result).toContainKeys(keys)
    expect(result.name).toBe(net)
  })
})

describe('network.setServer', () => {
  it('should be a function', () => {
    expect(network.setServer).toBeFunction()
  })

  it('should return false if setNetwork() was not called previously and no <server> is specified', async () => {
    if (typeof (network.network) !== 'undefined') {
      delete network.network
    }

    const result = await network.setServer()
    expect(result).toBeFalse()
  })

  it('should set a random server from the network if no <server> is specified', async () => {
    const net = 'mainnet'
    await network.setNetwork(net)
    const result = await network.setServer()
    expect(result).toBeString()
  })

  it('should set <server> as the selected server', async () => {
    const server = '54.38.48.168:4001'
    const result = await network.setServer(server)
    expect(result).toBe(server)
  })
})

describe('network.getFromNode', () => {
  it('should be a function', () => {
    expect(network.getFromNode).toBeFunction()
  })

  it('should throw an Error when called without previous setup of the network and no <peer> inputted', async () => {
    if (typeof (network.network) !== 'undefined') {
      delete network.network
    }

    if (typeof (network.server) !== 'undefined') {
      delete network.server
    }

    if (typeof (network.peer) !== 'undefined') {
      delete network.peer
    }

    const url = '/api/peers'
    let error
    try {
      await network.getFromNode(url)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(Error)
  })

  it('should return an object when called without previous setup of the network but with a valid <peer> inputted', async () => {
    const net = 'mainnet'
    await network.setNetwork(net)
    const peer = await network.setServer()

    if (typeof (network.network) !== 'undefined') {
      delete network.network
    }

    if (typeof (network.server) !== 'undefined') {
      delete network.server
    }

    if (typeof (network.peer) !== 'undefined') {
      delete network.peer
    }

    const url = '/api/peers'
    const result = await network.getFromNode(url, {}, peer)
    expect(result).toBeObject()
  })

  it('should return an object containing data when called', async () => {
    const net = 'mainnet'
    await network.setNetwork(net)

    const url = '/api/peers'
    const result = await network.getFromNode(url)
    expect(result).toBeObject()
    expect(result).toContainKey('data')
  })

  it('should return an object containing data when called with a valid <peer> inputted', async () => {
    const net = 'mainnet'
    await network.setNetwork(net)
    const peer = await network.setServer()

    const url = '/api/peers'
    const result = await network.getFromNode(url, {}, peer)
    expect(result).toBeObject()
    expect(result).toContainKey('data')
  })

  it('should return an object containing data when called with valid <param> inputted', async () => {
    const net = 'mainnet'
    await network.setNetwork(net)
    const address = 'ATsPMTAHNsUwKedzNpjTNRfcj1oRGaX5xC'
    const param = {address}

    const url = '/api/accounts'
    const result = await network.getFromNode(url, param)
    expect(result).toBeObject()
    expect(result).toContainKey('data')
    expect(result.data.account.address).toBe(address)
  })

  it('should return an object containing data when called with a valid <param> and <peer> inputted', async () => {
    const net = 'mainnet'
    await network.setNetwork(net)
    const address = 'ATsPMTAHNsUwKedzNpjTNRfcj1oRGaX5xC'
    const param = {address}
    const peer = await network.setServer()

    const url = '/api/accounts'
    const result = await network.getFromNode(url, param, peer)
    expect(result).toBeObject()
    expect(result).toContainKey('data')
    expect(result.data.account.address).toBe(address)
  })
})

describe('network.findAvailablePeers', () => {
  it('should be a function', () => {
    expect(network.findAvailablePeers).toBeFunction()
  })
})

describe('network.postTransaction', () => {
  it('should be a function', () => {
    expect(network.postTransaction).toBeFunction()
  })
})

describe('network.broadcast', () => {
  it('should be a function', () => {
    expect(network.broadcast).toBeFunction()
  })
})

describe('network.connect', () => {
  it('should be a function', () => {
    expect(network.connect).toBeFunction()
  })
})

describe('network.__getRandomPeer', () => {
  it('should be a function', () => {
    expect(network.__getRandomPeer).toBeFunction()
  })

  it('should return false if no network is set', async () => {
    if (typeof (network.network) !== 'undefined') {
      delete network.network
    }

    const result = await network.__getRandomPeer()
    expect(result).toBeFalse()
  })

   it('should return a string when a valid network is set', async () => {
    const net = 'mainnet'
    await network.setNetwork(net)

    const result = await network.__getRandomPeer()
    expect(result).toBeString()
  })
})

describe('network.__loadRemotePeers', () => {
  it('should be a function', () => {
    expect(network.__loadRemotePeers).toBeFunction()
  })
})

describe('network.__filterPeers', () => {
  it('should be a function', () => {
    expect(network.__filterPeers).toBeFunction()
  })
})

describe('network.__selectResponsivePeer', () => {
  it('should be a function', () => {
    expect(network.__selectResponsivePeer).toBeFunction()
  })
})
