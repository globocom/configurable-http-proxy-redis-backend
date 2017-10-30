/* globals beforeEach, afterAll, describe, it, expect */

const ConfigurableProxyRedisStorage = require('./index')

describe('ConfigurableProxyRedisStorage', () => {
  beforeEach((done) => {
    this.storage = new ConfigurableProxyRedisStorage({ redisURI: 'redis://localhost' })
    this.storage.clear().then(() => done())
  })

  afterAll((done) => {
    this.storage.clear(false).then(() => done())
  })

  it('should be a function', () => {
    expect(typeof ConfigurableProxyRedisStorage).toBe('function')
  })

  it('should return the data for the specified path', (done) => {
    this.storage.add('/myRoute', { test: 'value' })
    this.storage.get('/myRoute').then((data) => {
      expect(data).toEqual({ test: 'value' })
      done()
    })
  })

  it('should return null when not found', (done) => {
    this.storage.get('/notfound').then((result) => {
      expect(result).toBeUndefined()
      done()
    })
  })

  it('should return all routes', (done) => {
    this.storage.add('/myRoute', { test: 'value1' })
    this.storage.add('/myOtherRoute', { test: 'value2' })
    this.storage.getAll().then((routes) => {
      expect(Object.keys(routes).length).toEqual(2)
      expect(routes['/myRoute']).toEqual({ test: 'value1' })
      expect(routes['/myOtherRoute']).toEqual({ test: 'value2' })
      done()
    })
  })

  it('should return a blank object when no routes defined', (done) => {
    this.storage.getAll().then((routes) => {
      expect(routes).toEqual({})
      done()
    })
  })

  it('should return the target object for the path', (done) => {
    this.storage.add('/myRoute', { target: 'http://localhost:8213' })
    this.storage.getTarget('/myRoute').then((target) => {
      expect(target.prefix).toEqual('/myRoute')
      expect(target.data.target).toEqual('http://localhost:8213')
      done()
    })
  })

  it('should add data to the store for the specified path', (done) => {
    this.storage.add('/myRoute', { test: 'value' })
    this.storage.get('/myRoute').then((route) => {
      expect(route).toEqual({ test: 'value' })
      done()
    })
  })

  it('should overwrite any existing values', (done) => {
    Promise.all([
      this.storage.add('/myRoute', { test: 'value' }),
      this.storage.add('/myRoute', { test: 'updatedValue' }),
    ]).then(() => {
      this.storage.get('/myRoute').then((route) => {
        expect(route).toEqual({ test: 'updatedValue' })
        done()
      })
    })
  })

  it('should merge existing data with supplied data', (done) => {
    Promise.all([
      this.storage.add('/myRoute', { version: 1, test: 'value' }),
      this.storage.update('/myRoute', { version: 2 }),
    ]).then(() => {
      this.storage.get('/myRoute').then((route) => {
        expect(route.version).toEqual(2)
        expect(route.test).toEqual('value')
        done()
      })
    })
  })

  it('should remove a route from its table', (done) => {
    this.storage.add('/myRoute', { test: 'value' })
    this.storage.remove('/myRoute')
    this.storage.get('/myRoute').then((route) => {
      expect(route).toBeUndefined()
      done()
    })
  })

  it('should not throw when delete an undefined route', (done) => {
    this.storage.remove('/myRoute/foo/bar').then(done)
  })

  it('should return a promise when path is found', (done) => {
    this.storage
      .add('/myRoute', { test: 'value' })
      .then(() => this.storage.get('/myRoute'))
      .then(result => expect(result).toEqual({ test: 'value' }))
      .then(done)
  })

  it('should return null when a route is not found', (done) => {
    this.storage.get('/wut')
      .then(result => expect(result).toBeUndefined())
      .then(done)
  })
})
