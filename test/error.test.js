'use strict'

const assert = require('assert')
const fs = require('fs')
const http = require('http')
const path = require('path')
const Duplex = require('stream').Duplex
const vm = require('vm')

function loadEnhance (environment) {
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), {
    module,
    require,
    Buffer,
    process: { env: { NODE_ENV: environment } }
  })
  return module.exports
}

// Real ServerResponse serialization on an owned in-memory socket; no listener
// or external network connection is opened by these tests.
function respond (environment, operation, method) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const socket = new Duplex({
      read () {},
      write (chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk))
        callback()
      }
    })
    const res = new http.ServerResponse({
      method: method || 'GET', httpVersionMajor: 1, httpVersionMinor: 1
    })
    const timer = setTimeout(() => {
      closeSocket()
      reject(new Error('response did not finish'))
    }, 2000)
    let returnValue
    res.assignSocket(socket)
    res.on('error', fail)
    socket.on('error', fail)
    res.on('finish', () => {
      clearTimeout(timer)
      const wire = Buffer.concat(chunks)
      const split = wire.indexOf('\r\n\r\n')
      const head = wire.slice(0, split).toString()
      const lines = head.split('\r\n')
      const statusCode = Number(lines.shift().split(' ')[1])
      const headers = {}
      lines.forEach(line => {
        const colon = line.indexOf(':')
        headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim()
      })
      closeSocket()
      resolve({ statusCode, headers, body: wire.slice(split + 4), returnValue })
    })
    function fail (error) {
      clearTimeout(timer)
      closeSocket()
      reject(error)
    }
    function closeSocket () {
      if (typeof socket.destroy === 'function') socket.destroy()
      else socket.end()
    }
    try {
      loadEnhance(environment)(res)
      returnValue = operation(res)
    } catch (error) {
      fail(error)
    }
  })
}

function expectResponse (result, statusCode, body) {
  assert.strictEqual(result.statusCode, statusCode)
  assert.strictEqual(result.body.toString(), body)
  assert.strictEqual(result.headers['content-type'], 'text/plain')
  assert.strictEqual(result.headers['content-length'], String(Buffer.byteLength(body)))
  assert.strictEqual(result.returnValue, undefined)
}

;['production', 'test', undefined].forEach(environment => {
  test('default errors hide details outside development: ' + environment, () => {
    const error = new Error('private message')
    error.stack = 'private stack'
    return respond(environment, res => res.error(error)).then(result => {
      expectResponse(result, 500, 'Internal Server Error')
    })
  })
})

test('development errors send the existing stack and status 500', () => {
  return respond('development', res => res.error({
    message: 'message', stack: 'development stack'
  })).then(result => expectResponse(result, 500, 'development stack'))
})

test('statusCode takes precedence over status without exposing the stack', () => {
  return respond('production', res => res.error({
    statusCode: 404, status: 401, message: 'Not found', stack: 'private stack'
  })).then(result => expectResponse(result, 404, 'Not found'))
})

test('status is accepted and preserves UTF-8 response bytes', () => {
  return respond('production', res => res.error({
    status: 422, message: 'Invalid café', stack: 'private stack'
  })).then(result => expectResponse(result, 422, 'Invalid café'))
})

test('an explicit 500 preserves its supplied message and never sends the stack', () => {
  const error = { statusCode: 500, message: 'Public failure', stack: 'private stack' }
  return respond('production', res => res.error(error)).then(result => {
    expectResponse(result, 500, 'Public failure')
    assert.deepStrictEqual(error, {
      statusCode: 500, message: 'Public failure', stack: 'private stack'
    })
  })
})

test('development explicit statuses send the stack instead of the message', () => {
  return respond('development', res => res.error({
    statusCode: 403, message: 'Forbidden', stack: 'development stack'
  })).then(result => expectResponse(result, 403, 'development stack'))
})

;[0, null, false, '', NaN].forEach(statusCode => {
  test('falsy statusCode falls back to status: ' + String(statusCode), () => {
    return respond('production', res => res.error({
      statusCode, status: 418, message: 'Teapot'
    })).then(result => expectResponse(result, 418, 'Teapot'))
  })
})

;[0, null].forEach(value => {
  test('falsy codes retain the generic 500 fallback: ' + String(value), () => {
    return respond('production', res => res.error({
      statusCode: value, status: value, message: 'private', stack: 'private'
    })).then(result => expectResponse(result, 500, 'Internal Server Error'))
  })
})

test('a missing development stack remains an empty body', () => {
  return respond('development', res => res.error({
    statusCode: 400, message: 'not substituted for a stack'
  })).then(result => expectResponse(result, 400, ''))
})

test('a missing explicit production message remains an empty body', () => {
  return respond('production', res => res.error({
    statusCode: 400, stack: 'private stack'
  })).then(result => expectResponse(result, 400, ''))
})

test('error keeps its undefined return and overrides a prior status', () => {
  return respond('production', res => {
    assert.strictEqual(res.status(201), res)
    return res.error(new Error('private'))
  }).then(result => expectResponse(result, 500, 'Internal Server Error'))
})

;[204, 304].forEach(statusCode => {
  test('native HTTP still suppresses the body for status ' + statusCode, () => {
    return respond('production', res => res.error({
      statusCode, message: 'suppressed'
    })).then(result => {
      assert.strictEqual(result.statusCode, statusCode)
      assert.strictEqual(result.body.length, 0)
      assert.strictEqual(result.returnValue, undefined)
    })
  })
})

test('HEAD keeps the error status and suppresses the body', () => {
  return respond('production', res => res.error({
    statusCode: 404, message: 'Not found'
  }), 'HEAD').then(result => {
    assert.strictEqual(result.statusCode, 404)
    assert.strictEqual(result.body.length, 0)
    assert.strictEqual(result.headers['content-length'], undefined)
  })
})

;[99, 1000, Infinity, 'invalid', true, {}].forEach(statusCode => {
  test('native HTTP rejects an invalid truthy status: ' + String(statusCode), () => {
    return respond('production', res => res.error({
      statusCode, message: 'message'
    })).then(() => {
      throw new Error('expected native HTTP status validation')
    }, error => {
      assert.strictEqual(error.name, 'RangeError')
      assert(/status code/i.test(error.message))
    })
  })
})

test('native HTTP handles a numeric string status without new validation', () => {
  return respond('production', res => res.error({
    statusCode: '404', message: 'Not found'
  })).then(result => expectResponse(result, 404, 'Not found'))
})
