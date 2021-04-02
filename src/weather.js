/**
 * @typedef DayData
 * @property {string} low
 * @property {string} high
 * @property {string} day
 * @property {string} date
 * @property {string} precip
 */

/**
 * @typedef CurrentWeather
 * @property {string} temperature
 * @property {string} skyText
 * @property {string} image
 * @property {string} humidity
 * @property {string} feelsLike
 * @property {DayData} forecast
 */

/**
 * @typedef WeatherData
 * @property {string} name Name of location
 * @property {string} lat Latitude
 * @property {string} long Longitude
 * @property {string} degreeType Degree type
 * @property {CurrentWeather} weather
 * @property {DayData[]} forecast
 */

const weather = require('weather-js')

/**
 * Gets weather data for location
 * @param {string} location Location string
 * @param {string} degree Degree type
 * @returns {Promise<WeatherData>}
 */
module.exports = (location, degree) => {
  return new Promise((resolve, reject) => {
    weather.find({ search: location.replace(/ $/, ''), degreeType: degree === 'k' ? 'c' : degree }, (err, data) => {
      if (err) return reject(err)

      if (!data?.[0]) return reject(new Error('Invalid location'))
      data = data[0]

      if (degree === 'k') {
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
