'use strict'
const arkjs = require('arkjs')

class AccountUtils {
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
    const results = await network.getFromNode(`/api/accounts/delegates?address=${address}`)
    if (!results.data.hasOwnProperty('success') || !results.data.success) {
      let errorMsg = results.data.hasOwnProperty('error') && results.data.error
        ? results.data.error : 'Could not retrieve delegate information for this wallet.'
      throw new Error(errorMsg)
    }

    if (!results.data.hasOwnProperty('delegates') || !results.data.delegates.length) {
      throw new Error('Unable to unvote: no voted delegate found.')
    }
    return results.data.delegates[0]
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
