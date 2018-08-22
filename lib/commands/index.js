module.exports = {
  message: {
    sign: require('./message/sign'),
    verify: require('./message/verify')
  },
  network: {
    stats: require('./network/stats')
  },
  wallet: {
    create: require('./wallet/create'),
    delegate: require('./wallet/delegate'),
    send: require('./wallet/send'),
    status: require('./wallet/status'),
    vanity: require('./wallet/vanity'),
    vote: require('./wallet/vote'),
    unvote: require('./wallet/unvote'),
    signature: require('./wallet/signature'),
    multisignature: require('./wallet/multisignature'),
    address: require('./wallet/address'),
    ledger: require('./wallet/ledger')
  },
  transaction: {
    status: require('./transaction/status')
  }

}
