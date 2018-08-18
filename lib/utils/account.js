'use strict'
const arkjs = require('arkjs')
const bs58check = require('bs58check')

class AccountUtils {
  validateAddress (address, networkVersion) {
    try {
      let decode = bs58check.decode(address)
      return decode[0] === networkVersion
    } catch (error) {
      return false
    }
  }

  getAccountFromSeed (seed, networkVersion) {
    arkjs.crypto.setNetworkVersion(networkVersion);

    let keys = arkjs.crypto.getKeys(seed);
    let publicKey = keys.publicKey;
    let address = arkjs.crypto.getAddress(publicKey);

    let account = {
      'address': address,
      'publicKey': publicKey,
      'seed': seed,
      'networkVersion': networkVersion
    };
    return account;
  }

  async getDelegate (network, address) {
    const param = {
      page: 1,
      limit: 1
    }
    const results = await network.getFromNode(`/api/wallets/${address}/votes`, param)

    if (!results.data.hasOwnProperty('data')) {
      let errorMsg = 'Could not retrieve delegate information for this wallet.'
      throw new Error(errorMsg)
    }

    if (!results.data.data[0].hasOwnProperty('asset') || !results.data.data[0].asset.hasOwnProperty('votes') || !results.data.data[0].asset.votes.length) {
      throw new Error('Unable to unvote: no voted delegate found.')
    }

    const vote = results.data.data[0].asset.votes[0]
    if (vote.startsWith('-')) {
      throw new Error('Last registered vote contains an unvote')
    }

    const publicId = vote.substring(1)
    const delegate = await this.getDelegateById(network, publicId)
    return delegate
  }

  async getDelegateById (network, publicId) {
    const results = await network.getFromNode(`/api/delegates/${publicId}`)
    if (!results.data.hasOwnProperty('data') || !results.data.data.hasOwnProperty('username')) {
      return '-'
    }
    const delegate = results.data.data.username
    return delegate
  }

  async isValidDelegate (network, username) {
    const results = await network.getFromNode(`/api/delegates/get/?username=${username}`)
    if (!results.data.hasOwnProperty('success') || !results.data.success) {
      let errorMsg = results.data.hasOwnProperty('error') && results.data.error
        ? results.data.error : 'Could not retrieve delegate information for this username.'
      throw new Error(errorMsg)
    }

    if (!results.data.hasOwnProperty('delegate')) {
      throw new Error(`Unable to vote: delegate ${username} not found.`)
    }
    return results.data.delegate
  }
}

module.exports = new AccountUtils()
