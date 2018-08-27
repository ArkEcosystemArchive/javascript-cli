'use strict'
const bs58check = require('bs58check')
const crypto = require('./crypto')

class AccountUtils {
  validateAddress (address, networkVersion) {
    try {
      let decode = bs58check.decode(address)
      return decode[0] === networkVersion
    } catch (error) {
      return false
    }
  }

  getAccountFromSeed (passphrase, networkVersion) {
    let {address, publicKey} = crypto.getAddress(passphrase, networkVersion)

    let account = {
      address,
      publicKey,
      passphrase,
      networkVersion
    }
    return account
  }

  async getDelegate (network, address) {
    const param = {
      page: 1,
      limit: 1
    }
    const results = await network.getFromNode(`/api/v2/wallets/${address}/votes`, param)

    if (results === null || !results.data.hasOwnProperty('data')) {
      throw new Error('Could not retrieve delegate information for this wallet.')
    }

    if (!results.data.data[0].hasOwnProperty('asset') || !results.data.data[0].asset.hasOwnProperty('votes') || !results.data.data[0].asset.votes.length) {
      throw new Error('Unable to unvote: no voted delegate found.')
    }

    const vote = results.data.data[0].asset.votes[0]
    if (vote.startsWith('-')) {
      throw new Error('Last registered vote contains an unvote')
    }

    const publicId = vote.substring(1)
    const delegate = await this.isValidDelegate(network, publicId)
    return delegate
  }

  async isValidDelegate (network, publicId) {
    const results = await network.getFromNode(`/api/v2/delegates/${publicId}`)
    if (results === null || !results.data.hasOwnProperty('data') || !results.data.data.hasOwnProperty('username')) {
      return '-'
    }
    const delegate = results.data.data
    return delegate
  }
}

module.exports = new AccountUtils()
