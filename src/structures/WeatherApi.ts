import { CommandError } from '@jadl/cmd'
import weather from 'weather-js'

export enum DegreeType {
  Farenheit = 'f',
  Celcius = 'c',
  Kelvin = 'k'
}

interface DayData {
  low: string
  high: string
  day: string
  date: string
  precip: string
}

interface CurrentWeather {
  temperature: string
  skyText: string
  image: string
  humidity: string
  feelsLike: string
  forecast: DayData
}

interface WeatherData {
  /**
   * Name of location
   */
  name: string
  /**
   * Latitude
   */
  lat: string
  /**
   * Longitude
   */
  long: string
  /**
   * Degree type
   */
  degreeType: 'C' | 'F' | 'K'
  weather: CurrentWeather
  forecast: DayData[]
}

export class WeatherApi {
  async getWeather (location: string, degree: DegreeType): Promise<WeatherData> {
    return new Promise((resolve, reject) => {
      weather.find({ 
        search: location.replace(/ $/, ''),
        degreeType: degree === DegreeType.Kelvin ? DegreeType.Celcius : degree
      }, (err, data) => {
        if (err) return reject(err)
  
        if (!data?.[0]) return reject(new CommandError('Invalid location'))
        data = data[0]
  
        if (degree === DegreeType.Kelvin) {
          data.location.degreetype = 'K'
          data.current.temperature = `${Number(data.current.temperature) + 273.15}`
          data.current.feelslike = `${Number(data.current.feelslike) + 273.15}`
          data.forecast.forEach(obj => {
            obj.low = `${Number(obj.low) + 273.15}`
            obj.high = `${Number(obj.high) + 273.15}`
          })
        }
  
        resolve({
          name: data.location.name,
          lat: data.location.lat,
          long: data.location.long,
          degreeType: data.location.degreetype,
          weather: {
            temperature: data.current.temperature,
            skyText: data.current.skytext,
            image: data.current.imageUrl,
            humidity: data.current.humidity,
            feelsLike: data.current.feelslike,
            forecast: data.forecast.find(x => x.date === data.current.date)
          },
          forecast: data.forecast
        })
      })
    })
  }
}