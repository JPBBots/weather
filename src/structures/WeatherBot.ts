import { GatewayIntentBits } from 'discord-api-types'
import { SingleWorker, Snowflake } from 'jadl'
import { DegreeType, WeatherApi } from './WeatherApi'
import { Interface } from '@jpbbots/interface'

import type { Collection } from 'mongodb'
import { CommandHandler } from '@jadl/cmd'
import { WeatherCommand } from '../commands/Weather'
import { ForecastCommand } from '../commands/Forecast'
import { HelpCommand } from '../commands/Help'
import { SettingsCommand } from '../commands/Settings'
import { Embed } from '@jadl/embed'

export interface UserInfo {
  id: Snowflake
  zip: string | null
  dg: DegreeType | null
}

export const COLOR = 0x07a2e8

const prod = process.env.PRODUCTION === 'true'

export class WeatherBot extends SingleWorker {
  int = new Interface()
  db = this.int.createDb(
    'weather',
    process.env.DATABASE_PASSWORD!
  )

  weather = new WeatherApi()

  cmd = new CommandHandler(this, [
    WeatherCommand,
    ForecastCommand,
    SettingsCommand,
    HelpCommand
  ], {
    interactionGuild: prod ? undefined : '569907007465848842'
  })

  constructor() {
    super({
      token: process.env.BOT_TOKEN!,
      cache: {
        channels: [],
        roles: false
      },
      cacheControl: {
        guilds: []
      },
      intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages
    })

    this.setStatus('watching', 'The Weather')

    this.int.setupSingleton(this, 'weather')

    this.on('MESSAGE_CREATE', (msg) => {
      if ([`<@${this.user.id}>`, `<@!${this.user.id}>`].some(x => msg.content.startsWith(x))) {
        this.api.post(`/channels/${msg.channel_id}/messages`, { 
          body: {
            embeds: [
              new Embed()
                .title('We\'ve moved to slash commands!')
                .description('To get your weather do /weather or /forecast')
                .render()
            ]
          }
        })
      }
    })
  }

  get userDb (): Collection<UserInfo> {
    return this.db.collection('users')
  }
}