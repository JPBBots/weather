import { Decorators } from '@jadl/cmd'
import { WeatherBot } from '../../structures/WeatherBot'

export const Db = Decorators.createParameterDecorator(() => {
  return async (int, { worker }) => {
    return (
      (await (worker as WeatherBot).userDb.findOne({
        id: int.user?.id ?? int.member?.user.id
      })) ?? {
        zip: null,
        dg: null
      }
    )
  }
})
