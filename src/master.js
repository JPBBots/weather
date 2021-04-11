const { Master } = require('discord-rose')
const AutoPoster = require('topgg-autoposter')

const config = require('../config')
const path = require('path')

const master = new Master(path.resolve(__dirname, './worker.js'), {
  token: config.token,
  shards: 5,
  cacheControl: {
    roles: ['permissions'],
    guilds: ['owner_id'],
    channels: ['permission_overwrites']
  }
})

AutoPoster(config.dbl, master).on('posted', () => {
  console.log('Posted stats to Top.gg')
})

master.start()
