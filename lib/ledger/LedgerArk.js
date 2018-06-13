'use strict'

const utils = require('ledgerco/src/utils')

class LedgerArk {
  setComm (comm) {
    this.comm = comm
    this.comm.setScrambleKey('w0w')
  }

  async getPublicKey (path) {
    let splitPath = utils.splitPath(path)
    let buffer = Buffer.alloc(5 + 1 + splitPath.length * 4)
    buffer[0] = 0xe0
    buffer[1] = 0x02
    buffer[2] = 0x00
    buffer[3] = 0x40
    buffer[4] = 1 + splitPath.length * 4
    buffer[5] = splitPath.length
    splitPath.forEach((element, index) => {
      buffer.writeUInt32BE(element, 6 + 4 * index)
    })
    try {
      let response = await this.comm.exchange(buffer.toString('hex'), [0x9000])
      response = Buffer.from(response, 'hex')
      const publicKeyLength = response[0]
      let publicKey = response.slice(1, 1 + publicKeyLength).toString('hex')
      return Promise.resolve(publicKey)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  async signTransaction (path, rawTxHex) {
    const splitPath = utils.splitPath(path)
    const rawTx = Buffer.from(rawTxHex, 'hex')
    const data1HeaderLength = Buffer.alloc(2)
    const data2HeaderLength = Buffer.alloc(1)
    const pathLength = 4 * splitPath.length + 1
    const apdus = []
    let data1, data2, p1

    path = Buffer.alloc(pathLength - 1)
    splitPath.forEach((element, index) => {
      path.writeUInt32BE(element, 4 * index)
    })

    if (rawTx.length > 255 - pathLength) {
      data1 = rawTx.slice(0, 255 - pathLength)
      data2 = rawTx.slice(255 - pathLength)
      p1 = '00'
    } else {
      data1 = rawTx
      p1 = '80'
    }

    data1HeaderLength[0] = pathLength + data1.length
    data1HeaderLength[1] = splitPath.length
    if (data2) {
      data2HeaderLength[0] = data2.length
    }

    apdus.push('e004' + p1 + '40' + data1HeaderLength.toString('hex') + path.toString('hex') + data1.toString('hex'))
    if (data2) {
      apdus.push('e0048140' + data2HeaderLength.toString('hex') + data2.toString('hex'))
    }
    try {
      let response
      await utils.foreach(apdus, async (apdu) => {
        response = await this.comm.exchange(apdu, [0x9000])
      })
      const result = {}
      result.signature = response.substring(0, response.length - 4)
      return result
    } catch (error) {
      return Promise.reject(error)
    }
  }

  async getAppConfiguration () {
    const buffer = Buffer.alloc(5)
    buffer[0] = 0xe0
    buffer[1] = 0x06
    buffer[2] = 0x00
    buffer[3] = 0x00
    buffer[4] = 0x00

    try {
      let response = await this.comm.exchange(buffer.toString('hex'), [0x9000])
      const result = {}
      response = Buffer.from(response, 'hex')
      result['arbitraryDataEnabled'] = (response[0] & 0x01)
      result['version'] = '' + response[1] + '.' + response[2] + '.' + response[3]
      return result
    } catch (error) {
      Promise.reject(error)
    }
  }
}
module.exports = new LedgerArk()
