import { Decorators } from '@jadl/cmd'
import { WeatherBot } from '../../structures/WeatherBot'

export const Location = Decorators.createParameterDecorator(() => {
  return async (int, { worker }) => {
    const db = await (worker as WeatherBot).userDb.findOne({ id: int.user?.id ?? int.member?.user.id })

    return db?.zip ?? null
  }
})