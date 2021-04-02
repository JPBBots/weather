const { Worker, Embed, CommandContext } = require('discord-rose')
const { Interface } = require('interface')
const getWeather = require('./weather')

const config = require('../config')

const interface = new Interface()

const db = interface.createDb('weather', config.pass)

const degrees = {
  k: 'Kelvin',
  f: 'Farenheit',
  c: 'Celcius'
}

const worker = new Worker()
worker.db = db
worker.interface = interface

interface.setupWorker(worker)

worker.setStatus('watching', 'the Clouds')
const deg = '°'

worker.commands
  .options({
    default: {
      myPerms: ['embed']
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

worker.commands.CommandContext = class extends CommandContext {
  db = false

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

worker.commands
  .add({
    command: 'help',
    aliases: ['support'],
    exec: (ctx) => {
      return ctx.embed
        .title('Help with Weather Bot')
        .field('How to use', `Simply do ${ctx.prefix} [location], to see weather at said location\nYou can also do ${ctx.prefix} f [location], to see the forecast.`)
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
    exec: async (ctx) => {
      if (ctx.args[0] === 'location') {
        if (!ctx.args[1]) return ctx.error('Missing location: Do ...set location [location]')
        const { name } = await getWeather(ctx.args.slice(1).join(' '), 'f')
        await db.collection('users').updateOne({ id: ctx.message.author.id }, {
          $set: {
            zip: String(ctx.args[1])
          }
        }, { upsert: true })

        await ctx.embed
          .color(config.color)
          .description(`Set default location ${name}\n\nDo "${ctx.prefix}" to see this location.`)
          .send()
      } else if (ctx.args[0] === 'dg') {
        if (!ctx.args[1] || !Object.keys(degrees).includes(ctx.args[1])) return ctx.error(`Missing or invalid degree type, Do ...set dg [${Object.keys(degrees).join('/')}]`)

        await db.collection('users').updateOne({ id: ctx.message.author.id }, {
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
          .field('Default location', `To be able to just run ${ctx.prefix} to see the information at that location.\n\nDo: ${ctx.prefix}set location [location]`, true)
          .footer('Need help? Do @Weather help')

        if (db) embed.description(`Current settings, degree: ${db.dg}, location: ${db.zip}`)

        await embed.send()
      }
    }
  })
  .add({
    command: 'f',
    aliases: ['forecast'],
    exec: async (ctx) => {
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
    exec: async (ctx) => {
      if (!ctx.ran && !await ctx.getZip()) return ctx.error('Missing location! Do @Weather [location] OR run @Weather settings if you\'d like to set a default location')
      const response = await getWeather(ctx.ran ? ctx.ran + ctx.args.join(' ') : await ctx.getZip(), await ctx.getDegree())

      const { weather, degreeType } = response

      await weatherEmbed(ctx.embed, response)
        .thumbnail(weather.image)
        .field('Temperature', `${weather.temperature}${deg}${degreeType}`, true)
        .field('Feels Like', `${weather.feelsLike}${deg}${degreeType}`, true)
        .field('Sky', weather.skyText, true)
        .field('Humditiy', `${weather.humidity}%`, true)
        .field('High / Low', `${weather.forecast.high}${deg}${degreeType} / ${weather.forecast.low}${deg}${degreeType}`, true)
        .field('Precipitation', `${weather.forecast.precip ?? '0'}%`, true)
        .send()
    }
  })

worker.commands.error((ctx, error) => {
  if (!ctx.myPerms('sendMessages')) return
  if (!ctx.myPerms('embed')) return ctx.send('Missing `Embed Link` permissions.')

  ctx.embed
    .color(0xFF0000)
    .title('Error occured')
    .description(`\`\`\`\n${error.message}\`\`\``)
    .footer('Need help? Do @Weather help')
    .send()
})
