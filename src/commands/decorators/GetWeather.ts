import { Decorators } from '@jadl/cmd'
import { WeatherApi } from '../../structures/WeatherApi'
import { WeatherBot } from '../../structures/WeatherBot'

export type getWeather = WeatherApi['getWeather']

export const GetWeather = Decorators.createParameterDecorator(() => {
  return (int, { worker }) => {
    return (worker as WeatherBot).weather.getWeather
  }
})