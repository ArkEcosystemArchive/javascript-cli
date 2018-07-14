'use strict'

const logger = require('../../lib/services/logger.js')

describe('logger', () => {
  it('should be an object', () => {
    expect(logger).toBeObject()
  })
})

describe('logger.info', () => {
  it('should be a function', () => {
    expect(logger.info).toBeFunction()
  })
})

describe('logger.warn', () => {
  it('should be a function', () => {
    expect(logger.warn).toBeFunction()
  })
})

describe('logger.error', () => {
  it('should be a function', () => {
    expect(logger.error).toBeFunction()
  })
})
