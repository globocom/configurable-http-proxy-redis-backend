/* globals describe, it, expect */

const sentinel = require('./sentinel')

describe('Sentinel parser', () => {
  it('should return null for invalid urls', () => {
    expect(sentinel.parseURL('redis://localhost')).toBe(null)
    expect(sentinel.parseURL('redis://localhost:9999')).toBe(null)
    expect(sentinel.parseURL('sentinel+redis://localhost:9999')).toBe(null)
    expect(sentinel.parseURL('sentinel+redis://localhost:9999/mymaster')).toBe(null)
    expect(sentinel.parseURL('sentinel://localhost:9999')).toBe(null)
    expect(sentinel.parseURL('sentinel+redis://localhost:9999/mymaster')).toBe(null)
  })

  it('should return an object with pwd for valid urls', () => {
    const url = 'redis+sentinel://:Pwd@host2.dummy:9999,host1.dummy:9998/service_name:master'
    const expected = {
      name: 'master',
      password: 'Pwd',
      sentinels: [
        { host: 'host2.dummy', port: 9999 },
        { host: 'host1.dummy', port: 9998 },
      ],
    }
    expect(sentinel.parseURL(url)).toEqual(expected)
  })

  it('should return an object without pwd for valid urls', () => {
    const url = 'sentinel://host2.dummy:9999/service_name:master'
    const expected = {
      name: 'master',
      password: null,
      sentinels: [
        { host: 'host2.dummy', port: 9999 },
      ],
    }
    expect(sentinel.parseURL(url)).toEqual(expected)
  })

  it('should return an object for valid urls (no port)', () => {
    const url = 'redis+sentinel://host3.dummy,host4.dummy:123/masterNoPort'
    const expected = {
      name: 'masterNoPort',
      password: null,
      sentinels: [
        { host: 'host3.dummy', port: 26379 },
        { host: 'host4.dummy', port: 123 },
      ],
    }
    expect(sentinel.parseURL(url)).toEqual(expected)
  })
})
