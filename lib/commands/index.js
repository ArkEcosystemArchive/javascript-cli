module.exports = {
  message: {
    sign: require('./message/sign'),
    verify: require('./message/verify')
  },
  /* network: {
    connect: require('./network/connect'),
    connectNode: require('./network/connect-node'),
    disconnect: require('./network/disconnect')
  }, */
  wallet: {
    create: require('./wallet/create'),
    delegate: require('./wallet/delegate'),
    send: require('./wallet/send'),
    stats: require('./wallet/stats'),
    status: require('./wallet/status'),
    vanity: require('./wallet/vanity'),
    vote: require('./wallet/vote'),
    unvote: require('./wallet/unvote')
  }
}
