'use strict'

const assert = require('assert')
const http = require('http')

const stringify = require('fast-safe-stringify')
const isStream = require('is-stream')

const OK_STATUS = 200
const REDIRECT_STATUS = 302
const IN_DEV = process.env.NODE_ENV === 'development'

function isRes (res) {
  return res.setHeader && res.writeHead
}

function enhanceRes (res = {}, opts = {}) {
  assert(isRes(res), 'invalid res object provided')
  assert(typeof opts === 'object', 'options should be a object')

  res.statusCode = OK_STATUS

  function error ({ statusCode, status, message, stack }) {
    statusCode = statusCode || status

    if (statusCode) {
      send(statusCode, IN_DEV ? stack : message)
    } else {
      send(500, IN_DEV ? stack : 'Internal Server Error')
    }
  }

  function send (val = '') {
    if (typeof val === 'object') {
      const str = stringify(val)

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Length', Buffer.byteLength(str))

      return res.end(str)
    }

    if (Buffer.isBuffer(val)) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/octet-stream')
      }

      res.setHeader('Content-Length', val.length)
      return res.end(val)
    }

    if (isStream(val)) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/octet-stream')
      }

      return val.pipe(res)
    }

    res.setHeader('Content-Type', 'text/plain')
    res.end(val)
  }

  function status (code = OK_STATUS) {
    assert(typeof code === 'number', 'status - status code should be a number')
    res.statusCode = code

    return res
  }

  function redirect (url) {
    assert(url, 'redirect - URL is required')
    res.writeHead(302, { Location: url })
    res.end()
  }

  function html (str = '') {
    assert(str, 'html - HTML string is required')

    res.setHeader('Content-Type', 'text/html')
    res.end(str)
  }

  return Object.assign(res, { send, error, status, redirect, html })
}

module.exports = enhanceRes
