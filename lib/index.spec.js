/* globals describe, it, expect */

const ConfigurableProxyRedisStorage = require('./index')

describe('ConfigurableProxyRedisStorage', () => {
  it('should be a function', () => {
    expect(typeof ConfigurableProxyRedisStorage).toBe('function')
  })
})
