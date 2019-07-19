import { Command, Message, Middleware } from '@yamdbf/core';
import { using } from '@yamdbf/core/bin/command/CommandDecorators';
import { TextChannel } from 'discord.js';
import { BugReportsClient } from '../../client/bugreports-client';
import { GuildStorageKeys } from '../../config/enums/guild-storage.enum';
import { AppLogger } from '../../util/app-logger';

/**
 * Channel Command
 */

export default class extends Command<BugReportsClient> {
	private logger: AppLogger = new AppLogger('ChannelCommand');

	public constructor() {
		super({
		callerPermissions: [ 'ADMINISTRATOR' ],
		desc: 'Restrict which channel commands can be used in your guild.',
		group: 'Administration',
		guildOnly: true,
		name: 'channel',
		usage: '<prefix>channel <option> #bot-control'
		});
	}


	@using(Middleware.resolve(`option: String, channel: TextChannel`))
	@using(Middleware.expect(`option: ['commands', 'reports'], channel: TextChannel`))
	public async action(message: Message, [option, channel]: [string, TextChannel]): Promise<Message | Message[]> {
		switch (option) {
			case 'commands':
				message.guild.storage.set(GuildStorageKeys.commandsChannelId, channel.id);
				break;
			case 'reports':
				message.guild.storage.set(GuildStorageKeys.reportsChannelId, channel.id);
				break;
			default:
				return message.reply('it appears that option is not yet internally supported.');
		}


		return message.reply(`**${option}** will now only be in ${channel}.`);
	}
}