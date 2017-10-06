# Redis Backend for Jupyter's Configurable Proxy

*configurable-http-proxy-redis-backend* in an extension for [configurable-http-proxy](https://github.com/jupyterhub/configurable-http-proxy). It allows routes to be saved in a Redis server.

# Install

**configurable-http-proxy-redis-backend** requires Node.js ≥ 4.

To install *configurable-http-proxy-redis-backend*:

```
npm install configurable-http-proxy configurable-http-proxy-redis-backend
```

# Usage

After installing, you should be able to use **--storage-backend** *configurable-http-proxy-redis-backend* argument. 

```
node bin/configurable-http-proxy --ip 0.0.0.0 --port 8043 --api-ip 0.0.0.0 --api-port 8044 --default-target http://127.0.0.1:8081 --error-target http://127.0.0.1:8081/hub/error --log-level debug --storage-backend configurable-http-proxy-redis-backend
```
