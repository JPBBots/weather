const { Master } = require('discord-rose')
const AutoPoster = require('topgg-autoposter')

const config = require('../config')
const path = require('path')

const master = new Master(path.resolve(__dirname, './worker.js'), {
  token: config.token,
  cache: {
    channels: false
  },
  shards: 5,
  cacheControl: {
    roles: ['permissions'],
    guilds: ['owner_id']
  }
})

AutoPoster(config.dbl, master)

master.start()
