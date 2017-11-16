const SENTINEL_RE_URL = /sentinel:\/\/:?((\w+)(?:@))?([\w-.:,]+)\/(service_name:)?(\w+)/
const SENTINEL_DEFAULT_HOST = 'localhost'
const SENTINEL_DEFAULT_PWD = null
const SENTINEL_DEFAULT_MASTER = 'mymaster'
const SENTINEL_DEFAULT_PORT = 26379

const isSentinel = url => url.includes('sentinel://')

const parseURL = (url) => {
  /*
  * If a valid Sentinel url is given, convert it
  * to an object as specified in https://github.com/luin/ioredis.
  * Otherwise returns null.
  */

  const matches = SENTINEL_RE_URL.exec(url)

  if (matches) {
    const name = matches[5] || SENTINEL_DEFAULT_MASTER
    const password = matches[2] || SENTINEL_DEFAULT_PWD
    const hosts = matches[3] || SENTINEL_DEFAULT_HOST
    const sentinels = hosts.split(',').map((server) => {
      //
      // one or more host/port pairs are allowed.
      //
      const [host, port] = server.split(':')
      return { host, port: Number(port || SENTINEL_DEFAULT_PORT) }
    })

    return { sentinels, name, password }
  }

  return null
}

module.exports = { parseURL, isSentinel }
