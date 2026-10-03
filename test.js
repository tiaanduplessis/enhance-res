'use strict'

const assert = require('assert')
const { Readable, Writable } = require('stream')
const httpMocks = require('node-mocks-http')
const enhanceRes = require('./')

test('should be defined', () => {
  expect(enhanceRes).toBeDefined()
})

test('should enhance the res object', () => {
  const res = httpMocks.createResponse()
  enhanceRes(res)
  expect(res.send).toBeDefined()
  expect(res.status).toBeDefined()
  expect(res.error).toBeDefined()
  expect(res.redirect).toBeDefined()
  expect(res.html).toBeDefined()
})

function createResponse (headers = {}) {
  const result = {}
  const res = {
    headers: {},
    setHeader (name, value) {
      this.headers[name.toLowerCase()] = value
    },
    getHeader (name) {
      return this.headers[name.toLowerCase()]
    },
    writeHead () {},
    end (body) {
      this.body = body
      return result
    }
  }
  Object.keys(headers).forEach(name => res.setHeader(name, headers[name]))
  enhanceRes(res)
  res.endResult = result
  return res
}

test('sends a Buffer as the original bytes with its byte length', () => {
  const res = createResponse()
  const body = Buffer.from([0, 255, 65])
  assert.strictEqual(res.send(body), res.endResult)
  assert.strictEqual(res.body, body)
  assert.strictEqual(res.getHeader('Content-Type'), 'application/octet-stream')
  assert.strictEqual(res.getHeader('Content-Length'), 3)
})

test('preserves an explicit Buffer content type and replaces its length', () => {
  const res = createResponse({
    'Content-Type': 'image/png',
    'Content-Length': 99
  })
  const body = Buffer.from([0, 255, 65])
  res.send(body)
  assert.strictEqual(res.body, body)
  assert.strictEqual(res.getHeader('Content-Type'), 'image/png')
  assert.strictEqual(res.getHeader('Content-Length'), 3)
})

test('sends an empty Buffer as zero bytes', () => {
  const res = createResponse()
  const body = Buffer.alloc(0)
  res.send(body)
  assert.strictEqual(res.body, body)
  assert.strictEqual(res.getHeader('Content-Length'), 0)
  assert.strictEqual(res.getHeader('Content-Type'), 'application/octet-stream')
})

function createStream (chunks) {
  return new Readable({
    read () {
      this.push(chunks.length ? chunks.shift() : null)
    }
  })
}

function streamResponse (headers = {}) {
  const chunks = []
  const res = new Writable({
    highWaterMark: 1,
    write (chunk, encoding, callback) {
      chunks.push(Buffer.from(chunk))
      setImmediate(callback)
    }
  })
  const response = createResponse(headers)
  res.headers = response.headers
  res.setHeader = response.setHeader
  res.getHeader = response.getHeader
  res.writeHead = response.writeHead
  enhanceRes(res)
  res.chunks = chunks
  return res
}

function checkStream (headers, chunks, expectedType) {
  return new Promise((resolve, reject) => {
    const res = streamResponse(headers)
    const expected = Buffer.concat(chunks)
    const body = createStream(chunks.slice())
    res.on('error', reject)
    body.on('error', reject)
    res.on('finish', () => {
      try {
        assert.deepStrictEqual(Buffer.concat(res.chunks), expected)
        assert.strictEqual(res.getHeader('Content-Type'), expectedType)
        assert.strictEqual(res.getHeader('Content-Length'), undefined)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
    assert.strictEqual(res.send(body), res)
  })
}

test('pipes a Readable to completion with raw bytes and backpressure', () => {
  return checkStream(
    {},
    [Buffer.from([0, 255]), Buffer.from([65])],
    'application/octet-stream'
  )
})

test('preserves an explicit stream content type', () => {
  return checkStream(
    { 'Content-Type': 'image/png' },
    [Buffer.from([0, 255, 65])],
    'image/png'
  )
})

test('finishes an empty stream', () => {
  return checkStream({}, [], 'application/octet-stream')
})

test('leaves source stream errors available to the caller', () => {
  const res = streamResponse()
  const body = new Readable({ read () {} })
  const error = new Error('source failure')
  let received
  body.on('error', err => {
    received = err
  })
  assert.strictEqual(res.send(body), res)
  body.emit('error', error)
  assert.strictEqual(received, error)
  body.unpipe(res)
  res.end()
})

test('leaves destination stream errors available to the caller', () => {
  return new Promise((resolve, reject) => {
    const res = streamResponse()
    const error = new Error('destination failure')
    res._write = (chunk, encoding, callback) => callback(error)
    res.on('error', err => {
      try {
        assert.strictEqual(err, error)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
    res.send(createStream([Buffer.from([0, 255, 65])]))
  })
})

test('keeps ordinary JSON serialization and UTF-8 content length', () => {
  const res = createResponse({ 'Content-Type': 'custom/type' })
  const body = { greeting: 'héllo' }
  const expected = JSON.stringify(body)
  assert.strictEqual(res.send(body), res.endResult)
  assert.strictEqual(res.body, expected)
  assert.strictEqual(res.getHeader('Content-Type'), 'application/json')
  assert.strictEqual(
    res.getHeader('Content-Length'),
    Buffer.byteLength(expected)
  )
})

test('keeps circular JSON serialization without changing the object', () => {
  const res = createResponse()
  const body = { name: 'circular' }
  body.self = body
  res.send(body)
  assert.strictEqual(res.body, '{"name":"circular","self":"[Circular]"}')
  assert.strictEqual(
    res.getHeader('Content-Length'),
    Buffer.byteLength(res.body)
  )
  assert.strictEqual(body.self, body)
})
;[null, [1, 'two']].forEach(body => {
  test('keeps JSON behavior for ' + JSON.stringify(body), () => {
    const res = createResponse()
    res.send(body)
    assert.strictEqual(res.body, JSON.stringify(body))
    assert.strictEqual(res.getHeader('Content-Type'), 'application/json')
    assert.strictEqual(
      res.getHeader('Content-Length'),
      Buffer.byteLength(res.body)
    )
  })
})
;['héllo', '', undefined, false, 0].forEach(body => {
  test('keeps end and return behavior for ' + String(body), () => {
    const res = createResponse({ 'Content-Type': 'custom/type' })
    assert.strictEqual(res.send(body), undefined)
    assert.strictEqual(res.body, body === undefined ? '' : body)
    assert.strictEqual(res.getHeader('Content-Type'), 'text/plain')
    assert.strictEqual(res.getHeader('Content-Length'), undefined)
  })
})

test('keeps status chaining for binary sends', () => {
  const res = createResponse()
  assert.strictEqual(res.status(201), res)
  res.send(Buffer.from([0, 255, 65]))
  assert.strictEqual(res.statusCode, 201)
})

test('propagates errors from response end', () => {
  const res = createResponse()
  const error = new Error('end failure')
  res.end = () => {
    throw error
  }
  assert.throws(() => res.send(Buffer.from([0, 255, 65])), err => err === error)
})

test('keeps JSON serialization errors visible', () => {
  const res = createResponse()
  const error = new Error('serialization failure')
  const body = {
    toJSON () {
      throw error
    }
  }
  assert.throws(() => res.send(body), err => err === error)
})
