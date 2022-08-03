import { Embed } from '@jadl/builders'
import {
  APIMessageComponentInteraction,
  ButtonStyle,
  Snowflake
} from 'discord-api-types/v10'
import { ButtonMenu, Section } from '@jadl/cmd'
import {
  DegreeType,
  MeasurementSystem,
  WeatherApi
} from '../../structures/WeatherApi'
import { WeatherBot } from '../../structures/WeatherBot'
import { ForecastResult } from '../../WeatherAPITypings'

interface WeatherMenuData {
  location: string
  degree: DegreeType
  measurement: MeasurementSystem
}

const sameTime = (
  type: 'hour' | 'day',
  date1unformatted: string,
  date2unformatted: string
) => {
  const date1 = new Date(date1unformatted.replace(/-/g, '/'))
  const date2 = new Date(date2unformatted.replace(/-/g, '/'))

  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear() &&
    (type === 'hour' ? date1.getHours() === date2.getHours() : true)
  )
}

const directionNames = {
  S: 'South',
  N: 'North',
  E: 'East',
  W: 'West'
}

const singulars: Array<typeof directionNames[keyof typeof directionNames]> = [
  'South',
  'North'
]

const directionToReadable = (direction: string) => {
  const directions = direction.split('')

  const fullNames = directions.map((x) => directionNames[x])

  for (let i = 0; i < fullNames.length; i++) {
    if (!fullNames[i] || !singulars.includes(fullNames[i])) continue

    const next = fullNames[i + 1]
    if (!next) break

    if (!singulars.includes(next)) {
      fullNames[i] = fullNames[i] + next.toLowerCase()
      delete fullNames[i + 1]
      break
    }
  }

  return fullNames.filter((x) => x).join(' ')
}

const ukDefra = (num: number) => {
  if (num <= 3) return 'Low'
  if (num <= 6) return 'Moderate'
  if (num <= 9) return 'High'
  if (num >= 10) return 'Very High'
}

type Prefixes<
  K extends string | number | symbol,
  D extends string = string
> = K extends `${infer Prefix}_${D}` ? Prefix : never

type measure = 'mph' | 'kph' | 'mm' | 'in' | 'miles' | 'km'

export class WeatherMenu extends ButtonMenu<WeatherMenuData, WeatherBot> {
  degree<T extends any>(
    data: T,
    key: Prefixes<keyof T, 'c' | 'f'>,
    degree: DegreeType
  ): string {
    if (degree === DegreeType.Kelvin)
      return (data[key + '_c'] + 273.15).toFixed(1) + `°${degree.toUpperCase()}`

    return data[key + '_' + degree.toLowerCase()] + `°${degree.toUpperCase()}`
  }

  measurement<T extends any>(
    data: T,
    key: Prefixes<keyof T, measure>,
    measurement: MeasurementSystem
  ) {
    const get = (measure: measure) => {
      return data[key + '_' + measure]
    }
    const has = (measure: measure) => {
      return get(measure) != undefined
    }

    if (measurement === MeasurementSystem.Metric) {
      if (has('mm')) return get('mm') + 'mm'
      if (has('kph')) return get('kph') + ' KPH'
      if (has('km')) return get('km') + ' KM'
    } else {
      if (has('in')) return get('in') + ' inches'
      if (has('mph')) return get('mph') + ' MPH'
      if (has('miles')) return get('miles') + ' miles'
    }

    return 'unknown'
  }

  embed(location: ForecastResult['location']) {
    return new Embed()
      .title(
        `Weather in ${location.name}, ${location.region}`,
        `https://google.com/maps/@${location.lat},${location.lon},13z`
      )
      .timestamp()
  }

  async getWeather(location: string, userId?: Snowflake) {
    const weather = await WeatherApi.getForecast(location, userId)

    const day = weather.forecast.forecastday.find((x) =>
      sameTime('day', x.date, weather.location.localtime)
    )!

    const hour = day.hour.find((x) =>
      sameTime('hour', x.time, weather.location.localtime)
    )!

    return {
      location: weather.location,
      current: weather.current,
      day: day.day,
      astro: day.astro,
      hour
    }
  }

  @Section(
    {
      label: 'Overview',
      style: ButtonStyle.Primary
    },
    { row: 0 }
  )
  async overview(data: WeatherMenuData, int: APIMessageComponentInteraction) {
    const { current, location, day } = await this.getWeather(
      data.location,
      int.member!.user.id
    )

    let useRainRecord = day.daily_chance_of_rain > day.daily_chance_of_snow

    if (
      (useRainRecord ? day.daily_chance_of_rain : day.daily_chance_of_snow) ===
      0
    )
      useRainRecord = true

    return this.embed(location)
      .description(current.condition.text)
      .thumbnail(`${WeatherApi.METHOD}${current.condition.icon}`)
      .field('Temperature', this.degree(current, 'temp', data.degree), true)
      .field('Feels Like', this.degree(current, 'feelslike', data.degree), true)
      .field(
        'High / Low',
        `${this.degree(day, 'maxtemp', data.degree)} / ${this.degree(
          day,
          'mintemp',
          data.degree
        )}`,
        true
      )
      .field(
        `Chance of ${useRainRecord ? 'rain' : 'snow'}`,
        `${
          useRainRecord ? day.daily_chance_of_rain : day.daily_chance_of_snow
        }%`,
        true
      )
  }

  @Section(
    {
      label: 'Atmosphere',
      style: ButtonStyle.Primary
    },
    { row: 0 }
  )
  async atmosphere(data: WeatherMenuData) {
    const { location, current, day, hour } = await this.getWeather(
      data.location
    )

    return this.embed(location)
      .field('Humidity', `${current.humidity}%`, true)
      .field('Average Humidity', `${day.avghumidity}%`, true)
      .field('Dewpoint', this.degree(hour, 'dewpoint', data.degree), true)
      .field(
        'Rainfall',
        this.measurement(current, 'precip', data.measurement),
        true
      )
      .field('Gust', this.measurement(hour, 'gust', data.measurement), true)
      .field('Cloud Cover', hour.cloud + '%', true)
      .field(
        'Visibility',
        this.measurement(hour, 'vis', data.measurement),
        true
      )
      .field('UV index', `${current.uv}`, true)
  }

  @Section(
    {
      label: 'Wind',
      style: ButtonStyle.Primary
    },
    { row: 1 }
  )
  async wind(data: WeatherMenuData) {
    const { current, location, day, hour } = await this.getWeather(
      data.location
    )

    return this.embed(location)
      .field(
        'Windspeed',
        this.measurement(current, 'wind', data.measurement),
        true
      )
      .field('Direction', directionToReadable(current.wind_dir), true)
      .field(
        'Max Windspeed',
        this.measurement(day, 'maxwind', data.measurement),
        true
      )
      .field('Windchill', this.degree(hour, 'windchill', data.degree), true)
      .field('Gust', this.measurement(hour, 'gust', data.measurement), true)
  }

  @Section(
    {
      label: 'Astronomy',
      style: ButtonStyle.Primary
    },
    { row: 1 }
  )
  async astronomy(data: WeatherMenuData) {
    const { astro, location } = await this.getWeather(data.location)

    return this.embed(location)
      .field('Sunrise', astro.sunrise, true)
      .field('Sunset', astro.sunset, true)
      .field('Moonrise', astro.moonrise, true)
      .field('Moonset', astro.moonset, true)
      .field('Moon phase', astro.moon_phase, true)
      .field('Moon illumination', astro.moon_illumination + '%', true)
  }

  @Section(
    {
      label: 'Air Quality',
      style: ButtonStyle.Primary
    },
    { row: 1 }
  )
  async airQuality(data: WeatherMenuData) {
    const {
      current: { air_quality: aq },
      location
    } = await this.getWeather(data.location)

    const unit = ' μg/m3'

    return this.embed(location)
      .field('Carbon Monoxide (CO)', aq.co.toFixed(2) + unit, true)
      .field('Ozone (O3)', aq.o3.toFixed(2) + unit, true)
      .field('Nitrogen Dioxide (NO2)', aq.no2.toFixed(2) + unit, true)
      .field('Sulphur Dioxide (SO2)', aq.so2.toFixed(2) + unit, true)
      .field('PM2.5', aq.pm2_5.toFixed(2) + unit, true)
      .field('PM10', aq.pm10.toFixed(2) + unit, true)
      .field(
        'US EPA Index',
        [
          '',
          'Good',
          'Moderate',
          'Unhealthy for sensitive group',
          'Unhealthy',
          'Very Unhealty',
          'Hazardous'
        ][aq['us-epa-index']],
        true
      )
      .field(
        'UK Defra Index',
        `[${aq['gb-defra-index']} (${ukDefra(
          aq['gb-defra-index']
        )})](https://uk-air.defra.gov.uk/air-pollution/daqi)`,
        true
      )
  }

  @Section(
    {
      label: 'Alerts',
      style: ButtonStyle.Danger
    },
    { row: 2 }
  )
  async alerts(data: WeatherMenuData) {
    const { alerts, location } = await WeatherApi.getForecast(data.location)

    const embed = this.embed(location)

    alerts.alert.forEach((alert) => {
      if (Date.now() > new Date(alert.expires).getTime()) return

      const effective = (new Date(alert.effective).getTime() / 1000).toFixed(0)
      const expires = (new Date(alert.expires).getTime() / 1000).toFixed(0)

      embed.field(
        alert.event,
        (
          `Started <t:${effective}:R>\nExpires <t:${expires}:R>\n\n` +
          `${alert.desc.slice(0, 200)}\n\n` +
          `${alert.instruction}`
        ).slice(0, 1023)
      )
    })

    if (!embed.obj.fields?.length) embed.description('No alerts!')

    return embed
  }

  @Section(
    {
      label: 'All Info',
      style: ButtonStyle.Secondary
    },
    { row: 2 }
  )
  async all(data: WeatherMenuData, int: APIMessageComponentInteraction) {
    const overview = await this.overview(data, int)
    const wind = await this.wind(data)
    const atmosphere = await this.atmosphere(data)
    const astro = await this.astronomy(data)

    overview.obj.fields = overview.obj.fields!.concat(
      wind.render().fields!,
      atmosphere.render().fields!,
      astro.render().fields!
    )

    return overview
  }

  @Section(
    {
      label: 'Forecast',
      style: ButtonStyle.Success
    },
    { row: 0 }
  )
  async forecast(data: WeatherMenuData) {
    const weather = await WeatherApi.getForecast(data.location)

    const embed = this.embed(weather.location)

    weather.forecast.forecastday.forEach((day) => {
      const date = new Date(day.date.split('-').join(' ')) // properly format
        .toDateString()
        .split(' ') // turn into readable
        .slice(1)
        .slice(0, -1) // remove day name and year
        .join(' ') // join month and day

      embed.field(
        `${date} | ${day.date}`,
        `High: ${this.degree(day.day, 'maxtemp', data.degree)}\n` +
          `Low: ${this.degree(day.day, 'mintemp', data.degree)}\n` +
          `Chance of rain: ${day.day.daily_chance_of_rain}%`
      )
    })

    return embed
  }
}

export const weatherMenu = new WeatherMenu()
