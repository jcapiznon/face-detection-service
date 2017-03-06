'use strict'

const reekoh = require('reekoh')
const _plugin = new reekoh.plugins.Service()

const request = require('request')
const isEmpty = require('lodash.isempty')
const isPlainObject = require('lodash.isplainobject')

_plugin.on('data', (data) => {
  if (!isPlainObject(data)) {
    return _plugin.logException(new Error(`Invalid data received. Must be a valid JSON Object. Data: ${data}`))
  }

  if (isEmpty(data) || isEmpty(data.image)) {
    return _plugin.logException(new Error('Invalid data received. Data must have a base64 encoded image field.'))
  }

  request.post({
    url: _plugin.config.faceApiEndPoint,
    qs: {
      returnFaceId: _plugin.config.includeFaceId,
      returnFaceLandmarks: _plugin.config.includeFaceLandmarks,
      returnFaceAttributes: _plugin.config.faceAttributes
    },
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': _plugin.config.apiKey
    },
    body: new Buffer(data.image, 'base64')
  }, (error, response, body) => {
    if (error) {
      _plugin.logException(error)
    } else if (response.statusCode !== 200) {
      let errorMessage = ''

      try {
        errorMessage = JSON.parse(body).error.message
      } catch (err) {
        console.error(err)
      }
      _plugin.logException(new Error(`HTTP ${response.statusCode}: ${errorMessage}`))
    } else {
      try {
        let result = {
          faceDetectResult: JSON.parse(body)
        }

        _plugin.pipe(data, JSON.stringify(result))
        .then(() => {
          _plugin.log(JSON.stringify({
            title: 'Processed data using Face Detect Service',
            data: data,
            result: result
          }))
        })
        .catch((error) => {
          _plugin.logException(error)
        })
      } catch (error) {
        _plugin.logException(error)
      }
    }
  })
})

_plugin.once('ready', () => {
  if (isEmpty(_plugin.config.faceAttributes)) {
    _plugin.config.faceAttributes = 'age,gender'
  } else {
    _plugin.config.faceAttributes = _plugin.config.faceAttributes.join(',')
  }

  _plugin.config.includeFaceId = _plugin.config.includeFaceId
  _plugin.config.includeFaceId = _plugin.config.includeFaceLandmarks

  _plugin.log('Project Oxford Face Detect Service has been initialized.')
  _plugin.emit('init')
})

module.exports = _plugin

