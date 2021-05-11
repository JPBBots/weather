const { Master } = require('discord-rose')
const AutoPoster = require('topgg-autoposter')
const { Interface } = require('interface')
const int = new Interface()

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

int.setupMaster(master, 'weather')

AutoPoster(config.dbl, master).on('posted', () => {
  console.log('Posted stats to Top.gg')
})

master.start()
