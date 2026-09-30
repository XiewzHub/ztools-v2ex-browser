const assert = require('node:assert/strict')
const test = require('node:test')
const { readSystemHttpsProxy } = require('../../src-ztools/preload/proxy-request.cjs')

test('从 macOS 系统代理配置读取 HTTPS 代理地址', () => {
  const proxy = readSystemHttpsProxy(() => `
    <dictionary> {
      HTTPSEnable : 1
      HTTPSPort : 10808
      HTTPSProxy : 127.0.0.1
    }
  `)

  assert.deepEqual(proxy, { host: '127.0.0.1', port: 10808 })
})

test('缺少 HTTPS 系统代理时给出明确错误', () => {
  assert.throws(() => readSystemHttpsProxy(() => 'HTTPSEnable : 0'), /未检测到可用/)
})
