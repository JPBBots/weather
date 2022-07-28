import {
  APIApplicationCommandInteractionDataBasicOption,
  APIApplicationCommandOptionChoice,
  APIInteractionResponse,
  InteractionResponseType,
  Routes
} from 'discord-api-types/v10'
import {
  ApplicationCommandOptionType,
  InteractionType
} from 'discord-api-types/v9'
import { WeatherApi } from './structures/WeatherApi'
import { WeatherBot } from './structures/WeatherBot'

const weather = new WeatherBot()

weather.on('INTERACTION_CREATE', async (int) => {
  if (int.type === InteractionType.ApplicationCommandAutocomplete) {
    const option = int.data.options.find(
      (x) =>
        x.type === ApplicationCommandOptionType.String &&
        x.focused &&
        x.name === 'location'
    ) as
      | (APIApplicationCommandInteractionDataBasicOption & { value: string })
      | undefined

    if (!option) return
    let choices: APIApplicationCommandOptionChoice<string>[] = []

    if (option.value.length > 2) {
      const search = await WeatherApi.search(option.value)

      search.slice(0, 5).forEach((search) => {
        choices.push({
          name: `${search.name}, ${search.region}`,
          value: `${search.lat},${search.lon}`
        })
      })
    }

    weather.api.post(Routes.interactionCallback(int.id, int.token), {
      body: {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: {
          choices
        }
      } as APIInteractionResponse
    })
  }
})
