import { Command, Options, Run, CommandError } from '@jadl/cmd'
import { Embed } from '@jadl/embed'
import { DegreeType } from '../structures/WeatherApi'
import { COLOR } from '../structures/WeatherBot'
import { Degree } from './decorators/Degree'
import { getWeather, GetWeather } from './decorators/GetWeather'
import { Location } from './decorators/Location'

@Command('forecast', 'Gets the forecast for a location')
export class ForecastCommand {
  @Run()
  async forecast (
    @GetWeather() get: getWeather,
    @Degree() defaultDegree: DegreeType,
    @Location() defaultLocation?: string,
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
      ]
    }) degree = defaultDegree,
    @Options.String('location', 'Location to get the forecast in') location = defaultLocation
  ) {
    if (!location) throw new CommandError(
      new Embed()
        .title('Missing Location')
        .description(
          'Please add the location option (`/forecast location:_`)\n\n' +
          'Or set a default location with `/settings`'
        )
    )

    const { forecast, degreeType, name, lat, long } = await get(location, degree)
    const deg = `°${degreeType}`

    const embed = new Embed()
      .color(COLOR)
      .title(`Forecast in ${name}`, `https://google.com/maps/@${lat},${long},13z`)

    forecast.forEach(day => {
      const date = new Date(day.date.split('-').join(' ')) // properly format
        .toDateString().split(' ') // turn into readable
        .slice(1).slice(0, -1) // remove day name and year
        .join(' ') // join month and day

      embed.field(
        `${day.day} | ${date}`,
        `High: ${day.high}${deg}\n` +
        `Low: ${day.low}${deg}\n` +
        `Precipitation: ${day.precip ?? '0'}%`)
    })

    return embed
  }
}
