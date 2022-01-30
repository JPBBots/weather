import { Command, Options, Run, CommandError } from '@jadl/cmd'
import { Embed } from '@jadl/embed'
import { DegreeType } from '../structures/WeatherApi'
import { COLOR } from '../structures/WeatherBot'
import { Degree } from './decorators/Degree'
import { getWeather, GetWeather } from './decorators/GetWeather'
import { Location } from './decorators/Location'

@Command('weather', 'Gets the weather in a specific location or your default')
export class WeatherCommand {
  @Run()
  async getWeather(
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
    @Options.String('location', 'Location to get whether in') location = defaultLocation
  ) {
    if (!location) throw new CommandError(
      new Embed()
        .color('Red')
        .title('Missing Location')
        .description(
          'Please add the location option (`/weather location:_`)\n\n' +
          'Or set a default location with `/settings`'
        )
    )

    const { weather, degreeType, name, lat, long } = await get(location, degree)
    const deg = `°${degreeType}`

    return new Embed()
      .color(COLOR)
      .title(`Weather in ${name}`, `https://google.com/maps/@${lat},${long},13z`)
      .field('Temperature', `${weather.temperature}${deg}`, true)
      .field('Feels Like', `${weather.feelsLike}${deg}`)
      .field('Sky', weather.skyText, true)
      .field('Humidity', `${weather.humidity}%`, true)
      .field('High / Low', `${weather.forecast.high}${deg} / ${weather.forecast.low}${deg}`, true)
      .field('Precipitation', `${weather.forecast.precip ?? '0'}%`, true)
  }
}
