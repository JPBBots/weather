import { Decorators } from '@jadl/cmd'
import {
  APIApplicationCommandInteractionDataBasicOption,
  APIChatInputApplicationCommandInteractionData
} from 'discord-api-types/v10'
import { ApplicationCommandOptionType } from 'discord-api-types/v9'
import { DegreeType } from '../../structures/WeatherApi'
import { WeatherBot } from '../../structures/WeatherBot'

export const Degree = Decorators.createParameterDecorator<[required?: boolean]>(
  ([required], cmd) => {
    if (!cmd.interactionOptions) cmd.interactionOptions = []
    cmd.interactionOptions.push({
      type: ApplicationCommandOptionType.String,
      name: 'degree',
      description: 'Degree for the specific request',
      choices: [
        {
          name: 'Fahrenheit',
          value: DegreeType.Fahrenheit
        },
        {
          name: 'Celcius',
          value: DegreeType.Celsius
        },
        {
          name: 'Kelvin',
          value: DegreeType.Kelvin
        }
      ],
      required
    })
    return async (int, { worker }) => {
      const interactionDegree = (
        (int.data as APIChatInputApplicationCommandInteractionData)
          .options as APIApplicationCommandInteractionDataBasicOption[]
      )?.find((x) => x.name === 'degree')?.value

      if (interactionDegree) return interactionDegree

      const db = await (worker as WeatherBot).userDb.findOne({
        id: int.user?.id ?? int.member?.user.id
      })

      return db?.dg ?? DegreeType.Fahrenheit
    }
  }
)
