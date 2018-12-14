'use strict'

const pino = require('pino')

const pretty = pino.pretty()
pretty.pipe(process.stdout)

module.exports = pino({
  name: 'ARK-JavaScript-CLI',
  safe: true
}, pretty)
