const http = require('node:http')
const https = require('node:https')
const tls = require('node:tls')
const { execFileSync } = require('node:child_process')

function readSystemHttpsProxy(readProxyConfig = () => execFileSync('scutil', ['--proxy'], { encoding: 'utf8' })) {
  const config = readProxyConfig()
  const enabled = /HTTPSEnable\s*:\s*1/.test(config)
  const host = /HTTPSProxy\s*:\s*([^\s}]+)/.exec(config)?.[1]
  const port = Number(/HTTPSPort\s*:\s*(\d+)/.exec(config)?.[1])
  if (!enabled || !host || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('未检测到可用的 macOS HTTPS 系统代理。')
  }
  return { host, port }
}

class HttpsProxyAgent extends https.Agent {
  constructor(proxy) {
    super()
    this.proxy = proxy
  }

  createConnection(options, callback) {
    const connectRequest = http.request({
      host: this.proxy.host,
      port: this.proxy.port,
      method: 'CONNECT',
      path: `${options.host}:${options.port || 443}`,
      headers: { Host: `${options.host}:${options.port || 443}` }
    })
    connectRequest.setTimeout(12_000, () => connectRequest.destroy(new Error('连接系统代理超时。')))
    connectRequest.once('error', callback)
    connectRequest.once('connect', (response, socket, head) => {
      if (response.statusCode !== 200) {
        socket.destroy()
        callback(new Error(`系统代理拒绝连接 V2EX（HTTP ${response.statusCode}）。`))
        return
      }
      if (head.length) socket.unshift(head)
      const secureSocket = tls.connect({
        socket,
        servername: options.host,
        ALPNProtocols: ['http/1.1']
      })
      secureSocket.setTimeout(12_000, () => secureSocket.destroy(new Error('V2EX TLS 连接超时。')))
      secureSocket.once('error', callback)
      secureSocket.once('secureConnect', () => callback(null, secureSocket))
    })
    connectRequest.end()
  }
}

function requestJsonViaHttpsProxy(url, proxy) {
  const target = new URL(url)
  if (target.protocol !== 'https:') throw new Error('仅支持 HTTPS 的 V2EX 请求。')
  const agent = new HttpsProxyAgent(proxy)

  return new Promise((resolve, reject) => {
    const request = https.get({
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      headers: { Accept: 'application/json' },
      agent,
      timeout: 20_000
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.once('error', reject)
      response.once('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`V2EX 服务暂时不可用（HTTP ${response.statusCode}）。`))
          return
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch {
          reject(new Error('V2EX 返回了无法识别的数据。'))
        }
      })
    })
    request.once('timeout', () => request.destroy(new Error('V2EX 请求超时。')))
    request.once('error', reject)
  })
}

function createSystemProxyRequest(readProxyConfig) {
  return (url) => requestJsonViaHttpsProxy(url, readSystemHttpsProxy(readProxyConfig))
}

module.exports = { createSystemProxyRequest, HttpsProxyAgent, readSystemHttpsProxy, requestJsonViaHttpsProxy }
