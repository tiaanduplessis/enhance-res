'use strict'

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
