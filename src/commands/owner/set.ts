import { Command, Guild, Message, Middleware } from '@yamdbf/core';
import { using } from '@yamdbf/core/bin/command/CommandDecorators';
import { BugReportsClient } from '../../client/bugreports-client';
import { ClientStorageKeys } from '../../config/enums/client-storage-keys.enum';
import { AppLogger } from '../../util/app-logger';

/**
 * Set Command
 */

export default class extends Command<BugReportsClient> {
	private logger: AppLogger = new AppLogger('SetCommand');

	public constructor() {
		super({
			desc: 'Set bot settings',
			group: 'Moderation',
			name: 'set',
			ownerOnly: true,
			usage: `<prefix>set <option> <value>`
		});
	}

	@using(Middleware.resolve('option: String, value: String'))
	@using(Middleware.expect(
		`option: [`
		+ `'${ClientStorageKeys.mainGuildId}'`
		+ `], value: String`))
	public async action(message: Message, [option, value]: [string, string]): Promise<Message | Message[]> {
		try {
			switch (option) {
				case ClientStorageKeys.mainGuildId: 
					const guild: Guild = this.client.guilds.get(value);
					if (!guild) { return message.reply('it seems I could not find that server.'); }
					await this.client.storage.set(option, guild.id);				
					return message.reply(`I've set the option **${option}** to **${guild.name}**.`);
				default:
					return message.reply('it appears something went wrong. *(given option is not internally supported)*');
			}
	
		} catch (err) {
			this.logger.error(err);

			return message.reply(`Error:\`\`\`\n${err.message}\`\`\``);
		}
		
	}
}