import { GatewayIntentBits } from 'discord-api-types/v9'
import { SingleWorker, Snowflake } from 'jadl'
import { DegreeType, MeasurementSystem } from './WeatherApi'
import { Interface } from '@jpbbots/interface'

import type { Collection } from 'mongodb'
import { CommandHandler } from '@jadl/cmd'
import { WeatherCommand } from '../commands/Weather'
import { ForecastCommand } from '../commands/Forecast'
import { HelpCommand } from '../commands/Help'
import { SettingsCommand } from '../commands/Settings'
import { Embed } from '@jadl/builders'
import { weatherMenu, WeatherMenu } from '../commands/menus/WeatherMenu'

export interface UserInfo {
  id: Snowflake
  zip: string | null
  dg: DegreeType | null
  measurement: MeasurementSystem | null
}

export const COLOR = 0x07a2e8

Embed.default.color(COLOR)

const prod = process.env.PRODUCTION === 'true'

export class WeatherBot extends SingleWorker {
  int = new Interface(prod)
  db = this.int.createDb('weather', process.env.DATABASE_PASSWORD!, 'localhost')

  cmd = new CommandHandler(
    this,
    [
      WeatherCommand,
      ForecastCommand,
      SettingsCommand,
      HelpCommand,
      weatherMenu,
      SettingsCommand.changeDegrees,
      SettingsCommand.changeMeasurement,
      SettingsCommand.changeLocation
    ],
    {
      interactionGuild: prod ? undefined : '569907007465848842'
    }
  )

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

    this.int.commands.setupOldCommand([], ['', 'f', 'forecast'])
  }

  get userDb(): Collection<UserInfo> {
    return this.db.collection('users')
  }
}
