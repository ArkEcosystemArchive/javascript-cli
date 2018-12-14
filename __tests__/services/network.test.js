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
})

describe('network.setServer', () => {
  it('should be a function', () => {
    expect(network.setServer).toBeFunction()
  })
})

describe('network.getFromNode', () => {
  it('should be a function', () => {
    expect(network.getFromNode).toBeFunction()
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

describe('network.__getNodeAPIConfig', () => {
  it('should be a function', () => {
    expect(network.__getNodeAPIConfig).toBeFunction()
  })
})
