import {
  Command,
  Options,
  Run,
  CommandError,
  Author,
  Interaction
} from '@jadl/cmd'
import { Embed } from '@jadl/builders'
import {
  DegreeType,
  MeasurementSystem,
  WeatherApi
} from '../structures/WeatherApi'
import { Degree } from './decorators/Degree'
import { Location } from './decorators/Location'
import { Measurement } from './decorators/Measurement'
import { weatherMenu } from './menus/WeatherMenu'
import { APIUser } from 'discord-api-types/v9'

@Command('weather', 'Gets the weather in a specific location or your default')
export class WeatherCommand {
  @Run()
  async getWeather(
    @Degree() degree: DegreeType,
    @Measurement() measurement: MeasurementSystem,
    @Interaction() int,
    @Location() location?: string
  ) {
    if (!location)
      throw new CommandError(
        new Embed()
          .color('Red')
          .title('Missing Location')
          .description(
            'Please add the location option (`/weather location:_`)\n\n' +
              'Or set a default location with `/settings`'
          )
      )

    return weatherMenu.start(
      'overview',
      {
        location,
        degree,
        measurement
      },
      int
    )
  }
}
