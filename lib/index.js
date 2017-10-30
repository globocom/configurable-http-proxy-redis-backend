const Redis = require('ioredis')
const normalizeUrl = require('normalize-url')


const getRedisUri = () => {
  const uri = process.env.REDIS_URI
  if (!uri) {
    throw new Error('Environment variable REDIS_URI is not defined.')
  }
  return uri
}

const expand = (data) => {
  if (!data) return undefined
  const current = Object.assign(JSON.parse(data), {})
  if (current.last_activity) {
    current.last_activity = new Date(current.last_activity)
  }
  return current
}

const scrub = (data) => {
  if (!data) return undefined
  return JSON.stringify(data)
}

const getKeyPaths = (path) => {
  let key
  const keys = []
  const parts = (path || '').split('/')

  while (parts.length) {
    key = parts.pop()
    if (key) {
      keys.push(`${parts.join('/')}/${key}`)
    }
  }
  return keys.concat('/')
}

class ConfigurableProxyRedisStorage {
  constructor(options = {}) {
    this.options = options
    this.redis = new Redis(options.redisURI || getRedisUri())
  }

  get(ppath) {
    const path = this.cleanPath(ppath)
    return this.redis.hget('chp', path)
      .then(data => expand(data))
  }

  getTarget(ppath) {
    const path = this.cleanPath(ppath)
    const multi = this.redis.multi()
    const keys = getKeyPaths(path)
    keys.forEach((key) => { multi.hget('chp', key) })
    return multi.exec().then((result) => {
      const nonEmptyElements = result.filter(e => e[1] !== null)
      if (nonEmptyElements.length === 0) {
        return Promise.resolve(undefined)
      }

      const specificIndex = result.findIndex(item => item[1] !== null)
      let value = {}
      if (specificIndex >= 0) {
        value = {
          prefix: keys[specificIndex],
          data: JSON.parse(result[specificIndex][1]),
        }
      }
      return Promise.resolve(value)
    })
  }

  getAll() {
    // todo: change hkeys for hgetall
    return this.redis.hkeys('chp').then((keys) => {
      if (keys.length === 0) {
        return {}
      }
      const routes = {}
      const multi = this.redis.multi()
      keys.forEach(key => multi.hget('chp', key))
      return multi.exec().then((values) => {
        values.forEach((value, index) => {
          const key = keys[index]
          routes[key] = expand(value[1])
        })
        return routes
      })
    })
  }

  add(ppath, data) {
    const path = this.cleanPath(ppath)
    return this.redis.hset('chp', path, scrub(data))
  }

  update(ppath, data) {
    const path = this.cleanPath(ppath)
    return this.redis.hget('chp', path)
      .then((current) => {
        const item = expand(current)
        const updated = Object.assign(item, data)
        return this.redis.hset('chp', path, scrub(updated))
      })
  }

  remove(ppath) {
    const path = this.cleanPath(ppath)
    return this.redis.hdel('chp', path)
  }

  cleanPath(path) {
    if (!path || path === '/') return '/'
    return normalizeUrl(path)
  }

  clear() {
    // todo: change hkeys for hgetall
    return this.redis.hkeys('chp').then((keys) => {
      const pipeline = this.redis.pipeline()
      keys.forEach((key) => {
        if (key !== '/') pipeline.hdel('chp', key)
      })
      return pipeline.exec()
    })
  }
}

module.exports = ConfigurableProxyRedisStorage
