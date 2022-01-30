import { APIUser } from 'discord-api-types'
import { Command, Options, SubCommand, Worker, Author } from '@jadl/cmd'
import { Embed } from '@jadl/embed'
import { DegreeType } from '../structures/WeatherApi'
import { COLOR, UserInfo, WeatherBot } from '../structures/WeatherBot'
import { Db } from './decorators/Db'

@Command('settings', 'Changes your user settings')
export class SettingsCommand {
  @SubCommand('location', 'Sets the default location')
  async location(
    @Options.String('location', 'Default location to set', { required: true }) location: string,
    @Worker() worker: WeatherBot,
    @Author() author: APIUser
  ) {
    const { name } = await worker.weather.getWeather(location, DegreeType.Farenheit)
    await worker.userDb.updateOne({ id: author.id }, {
      $set: {
        zip: location
      }
    }, { upsert: true })

    return new Embed()
      .color(COLOR)
      .description(`Set default location ${name}\n\nDo /weather to see this location.`)
  }

  @SubCommand('degree', 'Sets the default degree')
  async degree(
    @Options.String('degree', 'Degree for the specific request', {
      choices: [
        {
          name: 'Farenheit',
          value: DegreeType.Farenheit
        },
        {
          name: 'Celcius',
          value: DegreeType.Celcius
        },
        {
          name: 'Kelvin',
          value: DegreeType.Kelvin
        }
      ],
      required: true
    }) degree: DegreeType,
    @Worker() worker: WeatherBot,
    @Author() author: APIUser
  ) {
    await worker.userDb.updateOne({ id: author.id }, {
      $set: {
        dg: degree
      }
    }, { upsert: true })

    return new Embed()
      .color(COLOR)
      .description(`Set default degree to ${degree}`)
  }

  @SubCommand('view', 'View the current settings')
  view(
    @Db() db: UserInfo
  ) {
    return new Embed()
      .color(COLOR)
      .title('Customization settings')
      .description(`Current settings, degree: ${db.dg ?? DegreeType.Farenheit} ${db.zip ? `, location: ${db.zip}` : ''}`)
      .field('Degrees', `To set your default degrees for any weather info.\n\nDo: /settings degree`, true)
      .field('Default location', `To be able to just run /weather to see the information at that location.\n\nDo: /settings location`, true)
      .footer('Need help? Do @Weather help')
  }
}
