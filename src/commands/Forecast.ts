import { Command, Run, CommandError, Interaction } from '@jadl/cmd'
import { Embed } from '@jadl/builders'
import { DegreeType, MeasurementSystem } from '../structures/WeatherApi'

import { Degree } from './decorators/Degree'
import { Location } from './decorators/Location'
import { Measurement } from './decorators/Measurement'
import { weatherMenu } from './menus/WeatherMenu'

@Command('forecast', 'Gets the forecast for a location')
export class ForecastCommand {
  @Run()
  async forecast(
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
      'forecast',
      {
        location,
        degree,
        measurement
      },
      int
    )
  }
}
