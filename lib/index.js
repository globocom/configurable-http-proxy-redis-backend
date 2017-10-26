const Redis = require('ioredis')
const normalizeUrl = require('normalize-url');


const getRedisUri = () => {
  const uri = process.env.REDIS_URI
  if (!uri) {
    throw new Error('Environment variable REDIS_URI is not defined.')
  }
  return uri
}

const expand = (data) => {
  if (!data) return null
  const current = Object.assign(data, {})
  if (current && current.last_activity) {
    current.last_activity = new Date(data.last_activity)
  }
  return JSON.parse(current)
}

const scrub = (data) => {
  if (!data) return null
  const current = Object.assign(data, {})
  if (current && current.last_activity) {
    current.last_activity = data.last_activity.toISOString()
  }
  return JSON.stringify(current)
}

const getKeyPaths = (path) => {
  let key
  const keys = []
  const parts = (path || '').split('/')

  while (parts.length) {
    key = parts.pop()
    if (key) {
      keys.push(`chp:${parts.join('/')}/${key}`)
    }
  }

  return keys.concat('/')
}

const clearKey = key => key.replace('chp:', '')


class ConfigurableProxyRedisStorage {
  constructor(options = {}) {
    this.options = options
    this.redis = new Redis(getRedisUri())
  }

  get(path) {
    if (!path) path = '/'
    return this.redis.get(`chp:${path}`)
      .then(data => expand(data))
  }

  getTarget(path) {
    if (!path) path = '/'
    const multi = this.redis.multi()
    const keys = getKeyPaths(path)
    keys.forEach((key) => { multi.get(key) })
    return multi.exec().then((result) => {

      const found = result.filter((result) => result[1] !== null )
      if (found.length === 0) {
        return null
      }

      const specificIndex = found.findIndex(item => item[1] !== null)
      let value = {}
      if (specificIndex >= 0) {
        value = {
          prefix: clearKey(keys[specificIndex]),
          data: JSON.parse(found[specificIndex][1]),
        }
      }
      return value
    })
  }

  getAll() {
    return this.redis.keys('chp:*').then((keys) => {
      if (keys.length === 0) {
        return expand('{}')
      }
      const routes = {}
      const multi = this.redis.multi()
      keys.forEach(key => multi.get(key))
      return multi.exec().then((values) => {
        values.forEach((value, index) => {
          const key = clearKey(keys[index])
          routes[key] = expand(value[1])
        })
        return routes
      })
    })
  }

  add(path, data) {
    if (!path) path = '/'
    return this.redis.set(`chp:${path}`, scrub(data))
  }

  update(path, data) {
    if (!path) path = '/'
    this.redis.get(`chp:${path}`)
      .then((current) => {
        const item = expand(current)
        const updated = Object.assign(item, data)
        return this.redis.set(`chp:${path}`, scrub(updated))
      })
  }

  remove(path) {
    if (!path) path = '/'
    return this.redis.del(`chp:${path}`)
  }

  cleanPath(path) {
    if (!path) path = '/'
    return normalizeUrl(path)
  }

  clear() {
    return this.redis.keys('chp:*').then((keys) => {
      const pipeline = this.redis.pipeline()
      keys.forEach(key => pipeline.del(key))
      return pipeline.exec().then(() => {})
    })
  }
}

module.exports = ConfigurableProxyRedisStorage
