import { Command, Options, Run, Worker } from '@jadl/cmd'
import { Embed } from '@jadl/embed'
import { COLOR, WeatherBot } from '../structures/WeatherBot'

@Command('help', 'Gives help for weather bot')
export class HelpCommand {
  @Run()
  getHelp(
    @Worker() worker: WeatherBot
  ) {
    return new Embed()
      .color(COLOR)
      .title('Help with Weather Bot')
      .field('How to use', `Simply do /weather to see the weather at the given location\nYou can also do /forecast to see the forecast`)
      .field('More Commands', [
        `**/help**: Shows this menu`,
        `**/settings**: Customizes settings`,
      ].join('\n'))
      .field('Helpful Links', `[Website](https://weather.jpbbots.org) | [Support Server](https://jpbbots.org/support)\n[Top.gg](https://top.gg/bot/${worker.user.id})`)
  }
}
