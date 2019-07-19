import { Command, Message } from '@yamdbf/core';
import { Collection, CollectorFilter, MessageCollector, MessageCollectorOptions, TextChannel } from 'discord.js';
import { BugReportsClient } from '../../client/bugreports-client';
import { GuildStorageKeys } from '../../config/enums/guild-storage.enum';
import { AppLogger } from '../../util/app-logger';

/**
 * Setup Command
 */

 export default class extends Command<BugReportsClient> {
		private logger: AppLogger = new AppLogger('SetupCommand');

		public constructor() {
			super({
				callerPermissions: ['ADMINISTRATOR'],
				desc: 'Set the questions for new bug reports.',
				group: 'Administration',
				guildOnly: true,
				name: 'setup',
				usage: '<prefix>setup'
			});
		}

		public async action(message: Message): Promise<Message | Message[]> {
			try {
				const questions: string[] = [];
				const textChannel: TextChannel = message.channel as TextChannel;
				const filter: CollectorFilter = (m: Message) => m.author.id === message.author.id;
				const options: MessageCollectorOptions = {};

				await message.channel.send(
					'Send the questions, with each question being their own message, for the bug report process. '
					+ 'Send **exit** to exit the setup, otherwise send **done** to when finished.'
				);

				const collector: MessageCollector = new MessageCollector(textChannel, filter, options)
					.on('collect', (msg: Message) => {
						const exit: boolean = msg.content.toLocaleLowerCase().startsWith('exit');
						const done: boolean = msg.content.toLocaleLowerCase().startsWith('done');
						if (exit) { return collector.stop('exit'); }
						else if (done) { return collector.stop('done'); }
						else { 
							questions.push(msg.content);
							msg.react('✅');
						}
					})
					.on('end', async (collected: Collection<string, Message>, reason: string) => {
						if (reason === 'exit') { return message.channel.send('Setup has been cancelled.'); }
						if (questions.length === 0) { return message.channel.send('No questions were given, cancelling setup.'); }

						// Save the questions
						await message.guild.storage.set(GuildStorageKeys.questions, questions);

						return message.reply(`new bug reports will now have your **${questions.length}** questions.`);
					});
			} catch (err) {
				this.logger.error('CommandError: ', err);

				return message.reply('An error occurred: ' + `\`\`\`\n${err.message}\`\`\``);
			}
		}
 }