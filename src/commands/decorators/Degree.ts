import { Decorators } from '@jadl/cmd'
import { DegreeType } from '../../structures/WeatherAPI'
import { WeatherBot } from '../../structures/WeatherBot'

export const Degree = Decorators.createParameterDecorator(() => {
  return async (int, { worker }) => {
    const db = await (worker as WeatherBot).userDb.findOne({ id: int.user?.id ?? int.member?.user.id })

    return db?.dg ?? DegreeType.Farenheit
  }
})
