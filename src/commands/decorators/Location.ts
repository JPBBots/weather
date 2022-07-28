import { Decorators } from '@jadl/cmd'
import {
  APIApplicationCommandInteractionDataBasicOption,
  APIChatInputApplicationCommandInteractionData,
  ApplicationCommandOptionType
} from 'discord-api-types/v9'
import { WeatherBot } from '../../structures/WeatherBot'

export const Location = Decorators.createParameterDecorator<
  [required?: boolean]
>(([required], cmd) => {
  if (!cmd.interactionOptions) cmd.interactionOptions = []
  cmd.interactionOptions.push({
    type: ApplicationCommandOptionType.String,
    name: 'location',
    description: 'Location to get weather in',
    required,
    autocomplete: true
  })
  return async (int, { worker }) => {
    const interactionLocation = (
      (int.data as APIChatInputApplicationCommandInteractionData)
        .options as APIApplicationCommandInteractionDataBasicOption[]
    )?.find((x) => x.name === 'location')?.value

    if (interactionLocation) return interactionLocation

    const db = await (worker as WeatherBot).userDb.findOne({
      id: int.user?.id ?? int.member?.user.id
    })

    return db?.zip ? db.zip.slice(0, 40) : null
  }
})
