import Bot from '@discord-ts-app/core'
import Env from '@discord-ts-app/env'
import { Lifecycle, Lifecycles } from '@discord-ts-app/lifecycle'
import { GuildMember, Message } from 'discord.js'

const settings = {
	PREFIX: Env.get('CLIENT_PREFIX'),
	NOT_ALLOWED_EXECUTE_COMMAND: Env.get('NOT_ALLOW_EXECUTE_COMMAND'),
	DELETE_TIMEOUT: Env.get('DELETE_TIMEOUT_MESSAGE')
}

export default class Guard {
	private bot: Bot

	constructor(bot: Bot) {
		this.bot = bot
	}

	public async protect(bot: Bot, message: Message) {
		const { content, member } = message

		if (message.author?.bot) return
		if (!content.startsWith(settings.PREFIX)) {
			return new Lifecycle(Lifecycles.MESSAGE_RECEIVED, { message })
		}

		const sender: GuildMember = member!
		const args: string[] = content.split(' ')
		const commandName = args[0].replace(settings.PREFIX, '')

		this.bot.commands
			.filter((command) => command.tag == commandName || command.alias?.includes(commandName))
			.map(async (command) => {
				const { roles, run } = command
				if (roles?.length) {
					if (hasRoles(roles!, sender)) {
						await run(message, args.slice(1))
					} else {
						const msg = await message.reply(settings.NOT_ALLOWED_EXECUTE_COMMAND)
						await msg.delete({ timeout: parseInt(settings.DELETE_TIMEOUT) || 5000 })
					}
				} else {
					await run(message, args.slice(1))
				}
				await message.delete()
				new Lifecycle(Lifecycles.COMMAND_RECEIVED)
			})
	}
}

function hasRoles(roles: Array<string>, sender: GuildMember): boolean {
	let bool: boolean = false
	if (sender.roles.cache.size > 1) {
		roles.map((role) => sender.roles.cache.has(role) && (bool = true))
	}
	return bool
}
