import {
  APIUser,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  Routes
} from 'discord-api-types/v9'
import { Command, Worker, Author, Run, ComponentRunner } from '@jadl/cmd'
import { Embed, MessageBuilder } from '@jadl/builders'
import {
  DegreeType,
  MeasurementSystem,
  WeatherApi
} from '../structures/WeatherApi'
import { UserInfo, WeatherBot } from '../structures/WeatherBot'
import {
  APIInteractionResponse,
  InteractionResponseType,
  TextInputStyle
} from 'discord-api-types/v10'

const swap = <V extends Record<string, string>>(
  json: V
): { [key in keyof V as V[key]]: key } => {
  var ret: any = {}
  for (var key in json) {
    ret[json[key]] = key
  }
  return ret
}

const FlippedDegreeType = swap(DegreeType)
const FlippedMeasurementType = swap(MeasurementSystem)

@Command('settings', 'Changes your user settings')
export class SettingsCommand {
  static changeDegrees = new ComponentRunner<
    ComponentType.SelectMenu,
    WeatherBot
  >({
    type: ComponentType.SelectMenu,
    custom_id: 'settings_degrees',
    options: [
      {
        label: 'Fahrenheit',
        value: DegreeType.Fahrenheit
      },
      {
        label: 'Celcius',
        value: DegreeType.Celsius
      },
      {
        label: 'Kelvin',
        value: DegreeType.Kelvin
      }
    ],
    placeholder: 'Choose degree type'
  }).setHandle(async (int, worker) => {
    await worker.userDb.updateOne(
      { id: int.member!.user.id },
      {
        $set: { id: int.member!.user.id, dg: int.data.values[0] as DegreeType }
      },
      { upsert: true }
    )

    const user = (await worker.userDb.findOne({ id: int.member!.user.id }))!

    return new Embed()
      .title('Weather Bot Settings')
      .description(SettingsCommand.createCurrentSettings(user))
  })

  static changeMeasurement = new ComponentRunner<
    ComponentType.SelectMenu,
    WeatherBot
  >({
    type: ComponentType.SelectMenu,
    custom_id: 'settings_measurement',
    options: [
      {
        label: 'Metric (MM/KPH)',
        value: MeasurementSystem.Metric
      },
      {
        label: 'Imperial (Inches/MPH)',
        value: MeasurementSystem.Imperial
      }
    ],
    placeholder: 'Choose measurement type'
  }).setHandle(async (int, worker) => {
    await worker.userDb.updateOne(
      { id: int.member!.user.id },
      {
        $set: {
          id: int.member!.user.id,
          measurement: int.data.values[0] as MeasurementSystem
        }
      },
      { upsert: true }
    )

    const user = (await worker.userDb.findOne({ id: int.member!.user.id }))!

    return new Embed()
      .title('Weather Bot Settings')
      .description(SettingsCommand.createCurrentSettings(user))
  })

  static changeLocation = new ComponentRunner<
    ComponentType.SelectMenu,
    WeatherBot
  >({
    type: ComponentType.SelectMenu,
    custom_id: 'open_location_modal',
    placeholder:
      'Change default location, from your recently searched locations',
    options: []
  }).setHandle(async (int, worker) => {
    await worker.userDb.updateOne(
      { id: int.member!.user.id },
      {
        $set: {
          id: int.member!.user.id,
          zip: int.data.values[0]
        }
      },
      { upsert: true }
    )

    const user = (await worker.userDb.findOne({ id: int.member!.user.id }))!

    return new Embed()
      .title('Weather Bot Settings')
      .description(SettingsCommand.createCurrentSettings(user))
  })

  static createCurrentSettings(user: UserInfo) {
    return (
      'Current settings:\n\n' +
      `**Location**: ${user.zip ?? 'None'}\n` +
      `**Degree**: ${FlippedDegreeType[user.dg ?? DegreeType.Fahrenheit]}\n` +
      `**Measurements**: ${
        FlippedMeasurementType[user.measurement ?? MeasurementSystem.Metric]
      }`
    )
  }

  @Run()
  async settings(@Author() author: APIUser, @Worker() worker: WeatherBot) {
    const user = (await worker.userDb.findOne({ id: author.id })) ?? {
      dg: DegreeType.Fahrenheit,
      id: author.id,
      measurement: MeasurementSystem.Metric,
      zip: null
    }

    const location = JSON.parse(
      JSON.stringify(SettingsCommand.changeLocation.render())
    ) as typeof SettingsCommand['changeLocation']['component']

    const userStored = WeatherApi.forecastCache
      .filter((x) => x.storedUsers.has(author.id))
      .array()

    location.options = userStored
      .filter(
        (a, ind) =>
          userStored.indexOf(
            userStored.find(
              (b) =>
                b.location.lat === a.location.lat &&
                b.location.lon === a.location.lon
            )!
          ) === ind
      )
      .slice(0, 10)
      .map((x) => ({
        label: `${x.location.name}, ${x.location.region}`,
        value: `${x.location.lat},${x.location.lon}`
      }))

    if (!location.options.length) {
      location.options = [
        {
          label: 'Search for a place to add a default',
          value: 'none',
          default: true
        }
      ]
      location.disabled = true
    }

    return new MessageBuilder()
      .setMessage({ flags: MessageFlags.Ephemeral })
      .addEmbed(
        new Embed()
          .title('Weather Bot Settings')
          .description(SettingsCommand.createCurrentSettings(user))
      )
      .addComponentRow(location)
      .addComponentRow(SettingsCommand.changeDegrees)
      .addComponentRow(SettingsCommand.changeMeasurement)
  }
}
