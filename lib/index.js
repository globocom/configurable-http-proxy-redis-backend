const Redis = require('ioredis')
const normalizeUrl = require('normalize-url')
const pathSep = require('path').sep

class ConfigurableProxyRedisStorage {
  constructor(options = {}) {
    /**
     * ConfigurableProxyRedisStorage uses redis as its storage.
     */

    this.options = options
    this.redis = new Redis(this._getRedisUri())
  }

  get REDIS_KEY_PREFIX() {
    return 'configurable-proxy-redis-storage'
  }

  _mustBeDefined(missing) {
    /**
     * Throws an error if a required param is missing.
     */

    throw new Error(`${missing} must be defined`)
  }

  /** @private */
  _getRedisUri() {
    /**
     * Looks for redisURI in options and process.env.REDIS_URI.
     */

    return this.options.redisURI || process.env.REDIS_URI ||
      this._mustBeDefined`REDIS_URI environment variable`
  }

  /** @private */
  _expandLastActivity(item) {
    /**
     * JSON.parse doesn't parse Date objects.
     * _expandLastActivity check if `item` has an ISO 8601 string
     * and returns it as a new Date object.
     */

    if (!item.last_activity) return item

    return Object.assign(item, {
      last_activity: new Date(item.last_activity),
    })
  }

  /** @private */
  _expand(item) {
    /**
     * Gets a string from Redis and returns it as JSON.
     * Returns undefined in order to keep compatibility with ConfigurableProxy.
     */

    return item ? this._expandLastActivity(JSON.parse(item)) : undefined
  }

  /** @private */
  _scrub(item) {
    /**
     * Gets an object and returns it as JSON string representation.
     * Returns undefined in order to keep compatibility with ConfigurableProxy.
     */

    return item ? JSON.stringify(item) : undefined
  }

  /** @private */
  _getKeyPaths(path) {
    /**
     * Gets an path and return all of its parents.
     * For instance: if '/foo/bar/xyz is given, it'll return
     * and array containing:
     * ['/foo/bar/xyz', '/foo/bar', '/foo', '/']
     */

    return this
      .cleanPath(path)
      .split(pathSep)
      .map((part, index, arr) =>
        `${arr.slice(0, index).join(pathSep)}/${part}`)
      .reverse()
  }

  cleanPath(path) {
    /**
     * Normalize URL path.
     * This method should be public since it's used by ConfigurableProxy.
     */

    return path && path !== pathSep ? normalizeUrl(path) : pathSep
  }

  get(path) {
    /**
     * Returns an expanded data from Redis based on its path.
     */

    const key = this.cleanPath(path)

    return this.redis
      .hget(this.REDIS_KEY_PREFIX, key)
      .then(data => this._expand(data))
  }

  add(path, data) {
    /**
     * Adds `data` to `path` key.
     */

    const key = this.cleanPath(path)

    return this.redis
      .hset(this.REDIS_KEY_PREFIX, key, this._scrub(data))
  }

  remove(path) {
    /**
     * Remove `data` from `path` key.
     */

    const key = this.cleanPath(path)

    return this.redis
      .hdel(this.REDIS_KEY_PREFIX, key)
  }

  update(path, data) {
    /**
     * Loads `path`, merge it with `data` and save it again.
     */

    const key = this.cleanPath(path)

    return this.get(key)
      .then(item => this.add(key, Object.assign(item, data)))
  }

  getAll() {
    /**
     * Return all registered routes.
     */

    return this.redis
      .hgetall(this.REDIS_KEY_PREFIX)
      .then((routes) => {
        /**
         * Expands all returned routes.
         */

        Object.keys(routes).forEach((key) => {
          routes[key] = this._expand(routes[key])
        })

        // return loaded routes
        return Promise.resolve(routes)
      })
  }

  getTarget(path) {
    /**
     * Returns the target for `path` or its parent.
     * Is it would not be find, returns undefined instead.
     */

    // it will look for path and its parents. See `_getKeyPaths`.
    const paths = this._getKeyPaths(this.cleanPath(path))

    // loads all registered routes.
    return this.getAll().then((registeredRoutes) => {
      //
      // check which routes from `path` exists in registeredRoutes.
      //
      const validRoutes = paths
        .filter(route => route in registeredRoutes && registeredRoutes[route])

      if (validRoutes.length === 0) {
        /**
         * No valid routes found, returns undefined.
         * Returns undefined in order to keep compatibility with ConfigurableProxy.
         */
        return Promise.resolve(undefined)
      }

      // get the first matching route and return it.
      const prefix = validRoutes[0]
      const data = registeredRoutes[prefix]
      return Promise.resolve({ prefix, data })
    })
  }

  clear(keepRoot = true) {
    /**
     * Clear all registered routes, if `keepRoot` is provided,
     * root ('/') will not be deleted.
     */

    const multi = this.redis.multi()

    return this.redis
      .hkeys(this.REDIS_KEY_PREFIX)
      .then((keys) => {
        /**
         * Find all keys from hash this.REDIS_KEY_PREFIX and delete.
         */

        keys
          .filter(key => keepRoot && key !== pathSep)
          .forEach(key => multi.hdel(this.REDIS_KEY_PREFIX, key))

        // exec delete commands in bulk.
        return multi.exec()
      })
  }
}

module.exports = ConfigurableProxyRedisStorage
