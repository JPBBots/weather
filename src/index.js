const { SingleWorker, Embed, CommandContext, SlashCommandContext } = require('discord-rose')
const { Interface } = require('@jpbbots/interface')
const getWeather = require('./weather')

const config = require('../config')

const interface = new Interface()

const db = interface.createDb('weather', config.pass)

const degrees = {
  k: 'Kelvin',
  f: 'Farenheit',
  c: 'Celcius'
}

const worker = new SingleWorker({
  token: config.token,
  shards: 5,
  cacheControl: {
    roles: ['permissions'],
    guilds: ['owner_id'],
    channels: ['permission_overwrites']
  }
})

interface.setupSingleton(worker, 'weather')

worker.db = db
worker.interface = interface;

// interface.setupWorker(worker)

worker.setStatus('watching', 'the Clouds')
const deg = '°'

worker.commands
  .options({
    default: {
      myPerms: ['embed', 'readHistory']
    }
  })
  .prefix(() => {
    return '<@' + worker.user.id + '>'
  })
  .middleware((ctx) => {
    if (ctx.flags.d) ctx.flags.degree = ctx.flags.d
    if (ctx.flags.degree && !Object.keys(degrees).includes(ctx.flags.degree)) throw new Error(`Invalid degree type ${ctx.flags.degree}, expected one of ${Object.keys(degrees).join(', ')}`)
    return true
  })

/**
 * Creates base weather display embed
 * @param {Embed} embed 
 * @param {import('./weather').WeatherData} response
 * @returns {Embed}
 */
const weatherEmbed = (embed, response, forecast = false) => {
  return embed
    .color(config.color)
    .title(`${forecast ? 'Forecast' : 'Weather'} in ${response.name}`, `https://google.com/maps/@${response.lat},${response.long},13z`)
    .footer('Need help? Do @Weather help')
    .timestamp()
}

worker.commands
  .add({
    command: 'help',
    aliases: ['support'],
    interaction: {
      name: 'help',
      description: 'Gives help for weather bot'
    },
    exec: (ctx) => {
      return ctx.embed
        .title('Help with Weather Bot')
        .field('How to use', `Simply do ${ctx.weatherCommand} [location], to see weather at said location\nYou can also do ${ctx.prefix} f [location], to see the forecast.`)
        .field('More Commands', [
          `help: Shows this menu`,
          `settings: Customizes settings`,
        ].map(x => `${ctx.prefix}${x}`).join('\n'))
        .field('Helpful Links', `[Website](https://weather.jpbbots.org) | [Support Server](https://jpbbots.org/support)\n[Top.gg](https://top.gg/bot/${ctx.worker.user.id})`)
        .send()
    }
  })
  .add({
    command: 'settings',
    aliases: ['set', 'setloc', 'setdg'],
    interaction: {
      name: 'settings',
      description: 'Changes your user settings',
      options: [{
        name: 'location',
        description: 'Sets the default location',
        type: 1,
        options: [{
          name: 'place',
          required: true,
          description: 'Default location to set',
          type: 3
        }]
      }, {
        name: 'degree',
        description: 'Sets default degrees',
        type: 1,
        options: [{
          name: 'dg',
          description: 'Default degree to set',
          type: 3,
          required: true,
          choices: [{
            name: 'Farenheit',
            value: 'f'
          }, {
            name: 'Celcius',
            value: 'c'
          }, {
            name: 'Kelvin',
            value: 'k'
          }]
        }]
      }, {
        name: 'current',
        description: 'Gets current settings',
        type: 1
      }]
    },
    exec: async (ctx) => {
      if (ctx.isInteraction) {
        if (ctx.options.location) {
          ctx.args = ['location', ctx.options.location.place]
        } else if (ctx.options.degree) {
          ctx.args = ['dg', ctx.options.degree.dg]
        } else if (ctx.options.current) {
          ctx.args = []
        }
      }
      if (ctx.args[0] === 'location') {
        if (!ctx.args[1]) return ctx.error('Missing location: Do ...set location [location]')
        const location = ctx.args.slice(1).join(' ')
        const { name } = await getWeather(location, 'f')
        await db.collection('users').updateOne({ id: ctx.author.id }, {
          $set: {
            zip: location
          }
        }, { upsert: true })

        await ctx.embed
          .color(config.color)
          .description(`Set default location ${name}\n\nDo "${ctx.weatherCommand}" to see this location.`)
          .send()
      } else if (ctx.args[0] === 'dg') {
        if (!ctx.args[1] || !Object.keys(degrees).includes(ctx.args[1])) return ctx.error(`Missing or invalid degree type, Do ...set dg [${Object.keys(degrees).join('/')}]`)

        await db.collection('users').updateOne({ id: ctx.author.id }, {
          $set: {
            dg: ctx.args[1]
          }
        }, { upsert: true })

        await ctx.embed
          .color(config.color)
          .description(`Set default degree to ${ctx.args[1]}`)
          .send()
      } else {
        const db = await ctx.getDb()
        const embed = ctx.embed
          .color(config.color)
          .title('Customization settings')
          .field('Degrees', `To set your default degrees for any weather info.\n\nDo: ${ctx.prefix}set dg [${Object.keys(degrees).join('/')}]`, true)
          .field('Default location', `To be able to just run ${ctx.weatherCommand} to see the information at that location.\n\nDo: ${ctx.prefix}set location [location]`, true)
          .footer('Need help? Do @Weather help')

        if (db) embed.description(`Current settings, degree: ${db.dg}, location: ${db.zip}`)

        await embed.send()
      }
    }
  })
  .add({
    command: 'f',
    interaction: {
      name: 'forecast',
      description: 'Gets the forecast for a location',
      options: [{
        name: 'location',
        description: 'Location to check the forecast in',
        type: 3
      }]
    },
    aliases: ['forecast'],
    exec: async (ctx) => {
      if (ctx.isInteraction) {
        ctx.args = [ctx.options.location]
      }

      if (!ctx.args[0] && !await ctx.getZip()) return ctx.error('Missing location! Do @Weather f [location] OR run @Weather settings if you\'d like to set a default location')

      const response = await getWeather(ctx.args[0] ? ctx.args.join(' ') : await ctx.getZip(), await ctx.getDegree())

      const embed = weatherEmbed(ctx.embed, response, true)

      const { degreeType } = response

      response.forecast.forEach(day => {
        const date = new Date(day.date.split('-').join(' ')) // properly format
          .toDateString().split(' ') // turn into readable
          .slice(1).slice(0, -1) // remove day name and year
          .join(' ') // join month and day
        embed.field(`${day.day} | ${date}`, `High: ${day.high}${deg}${degreeType}\nLow: ${day.low}${deg}${degreeType}\nPrecipitation: ${day.precip ?? '0'}%`)
      })

      await embed.send()
    }
  })
  .add({
    command: /.*/,
    interaction: {
      name: 'weather',
      description: 'Gets the weather in a specific location or your default',
      options: [{
        name: 'location',
        description: 'Location to get whether in',
        type: 3
      }]
    },
    exec: async (ctx) => {
      if (ctx.isInteraction) {
        const loc = ctx.args.shift()
        ctx.ran = loc
      }
      if (!ctx.ran && !await ctx.getZip()) return ctx.error('Missing location! Do @Weather [location] OR run @Weather settings if you\'d like to set a default location')
      const response = await getWeather(ctx.ran ? ctx.ran + ctx.args.join(' ') : await ctx.getZip(), await ctx.getDegree())

      const { weather, degreeType } = response

      await weatherEmbed(ctx.embed, response)
        .thumbnail(weather.image)
        .field('Temperature', `${weather.temperature}${deg}${degreeType}`, true)
        .field('Feels Like', `${weather.feelsLike}${deg}${degreeType}`, true)
        .field('Sky', weather.skyText, true)
        .field('Humidity', `${weather.humidity}%`, true)
        .field('High / Low', `${weather.forecast.high}${deg}${degreeType} / ${weather.forecast.low}${deg}${degreeType}`, true)
        .field('Precipitation', `${weather.forecast.precip ?? '0'}%`, true)
        .send()
    }
  })

worker.commands.CommandContext = class extends CommandContext {
  db = false

  get weatherCommand () {
    return this.prefix
  }

  async getDb () {
    if (this.db !== false) return this.db

    this.db = await db.collection('users').findOne({ id: this.message.author.id })

    return this.db
  }

  async getDegree () {
    if (this.flags.degree) return this.flags.degree

    const user = await this.getDb()

    if (!user) return 'f'

    return user.dg
  }

  async getZip () {
    return (await this.getDb())?.zip
  }
}
worker.commands.SlashCommandContext = class extends SlashCommandContext {
  db = false

  get weatherCommand () {
    return '/weather'
  }

  async getDb () {
    if (this.db !== false) return this.db

    this.db = await db.collection('users').findOne({ id: this.author.id })

    return this.db
  }

  async getDegree () {
    if (this.flags.degree) return this.flags.degree

    const user = await this.getDb()

    if (!user) return 'f'

    return user.dg
  }

  async getZip () {
    return (await this.getDb())?.zip
  }
}

