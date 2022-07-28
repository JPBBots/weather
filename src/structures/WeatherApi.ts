import { Embed } from '@jadl/builders'
import { CommandError } from '@jadl/cmd'
import { Cache } from '@jpbberry/cache'
import { Snowflake } from 'jadl'
import { request } from 'undici'
import {
  CurrentWeatherResult,
  ForecastResult,
  SearchResult
} from '../WeatherAPITypings'

export enum DegreeType {
  Fahrenheit = 'f',
  Celsius = 'c',
  Kelvin = 'k'
}

export enum MeasurementSystem {
  Metric = 'm',
  Imperial = 'i'
}

export class WeatherApi {
  static METHOD = 'https:'
  static WEATHER_URL = `${this.METHOD}//api.weatherapi.com/v1/`
  static searchCache = new Cache<string, SearchResult[]>(900000)
  static currentWeatherCache = new Cache<string, CurrentWeatherResult>(1.8e6)
  static forecastCache = new Cache<string, ForecastResult>(1.8e6)

  static async request(
    type: 'current' | 'forecast' | 'search',
    params: Record<string, string>
  ) {
    params.key = process.env.WEATHER_KEY!

    const { body } = await request(this.WEATHER_URL + type + '.json', {
      query: params
    })

    const json = await body.json()

    if (json.error) {
      throw new CommandError(
        new Embed()
          .color('Red')
          .title('Weather Error')
          .description(json.error.message)
      )
    }

    return json
  }

  static async getCurrentWeather(
    q: string,
    userId?: Snowflake
  ): Promise<CurrentWeatherResult> {
    const cached = this.currentWeatherCache.get(q)
    if (cached) {
      if (userId) cached.storedUsers.add(userId)
      return cached
    }

    const res = await this.request('current', { q, aqi: 'no' })

    res.storedUsers = new Set()
    if (userId) res.storedUsers.add(userId)

    this.currentWeatherCache.set(q, res)

    return res
  }

  static async getForecast(
    q: string,
    userId?: Snowflake
  ): Promise<ForecastResult> {
    const cached = this.forecastCache.get(q)
    if (cached) {
      if (userId) cached.storedUsers.add(userId)
      return cached
    }

    const res = await this.request('forecast', {
      q,
      days: '4',
      alerts: 'yes',
      aqi: 'yes'
    })

    res.storedUsers = new Set()
    if (userId) res.storedUsers.add(userId)

    this.forecastCache.set(q, res)

    return res
  }

  static async search(q: string): Promise<SearchResult[]> {
    const cached = this.searchCache.get(q)
    if (cached) return cached

    const res = await this.request('search', { q })
    this.searchCache.set(q, res)

    return res
  }
}
