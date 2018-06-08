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
}

module.exports = new AccountUtils()
