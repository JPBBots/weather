import { Decorators } from '@jadl/cmd'
import {
  APIApplicationCommandInteractionDataBasicOption,
  APIChatInputApplicationCommandInteractionData
} from 'discord-api-types/v10'
import { ApplicationCommandOptionType } from 'discord-api-types/v9'
import { MeasurementSystem } from '../../structures/WeatherApi'
import { WeatherBot } from '../../structures/WeatherBot'

export const Measurement = Decorators.createParameterDecorator(([], cmd) => {
  if (!cmd.interactionOptions) cmd.interactionOptions = []
  cmd.interactionOptions.push({
    type: ApplicationCommandOptionType.String,
    name: 'measurement',
    description: 'Measurement system for the specific request',
    choices: [
      {
        name: 'Metric (MM/KPH)',
        value: MeasurementSystem.Metric
      },
      {
        name: 'Imperial (Inches/MPH)',
        value: MeasurementSystem.Imperial
      }
    ]
  })
  return async (int, { worker }) => {
    const interactionMeasurement = (
      (int.data as APIChatInputApplicationCommandInteractionData)
        .options as APIApplicationCommandInteractionDataBasicOption[]
    )?.find((x) => x.name === 'measurement')?.value

    if (interactionMeasurement) return interactionMeasurement

    const db = await (worker as WeatherBot).userDb.findOne({
      id: int.user?.id ?? int.member?.user.id
    })

    return db?.measurement ?? MeasurementSystem.Metric
  }
})
