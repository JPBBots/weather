const { Master } = require('discord-rose')
const config = require('../config')
const path = require('path')

const master = new Master(path.resolve(__dirname, './worker.js'), {
  token: config.token,
  cache: {
    channels: false
  },
  cacheControl: {
    roles: ['permissions'],
    guilds: ['owner_id']
  }
})

master.start()