import { Command, GuildStorage, Message, Guild } from '@yamdbf/core';
import { Collection, CollectorFilter, EmbedField, MessageCollector, MessageCollectorOptions, MessageEmbed, TextChannel, User } from 'discord.js';
import uniqid from 'uniqid';
import { BugReportsClient } from '../../client/bugreports-client';
import { GuildStorageKeys } from '../../config/enums/guild-storage.enum';
import { IBugReport, IResponse } from '../../config/interfaces/report.interface';
import { AppLogger } from '../../util/app-logger';

/**
 * Report Command
 */

export default class extends Command<BugReportsClient> {
	private logger: AppLogger = new AppLogger('ReportCommand');

	public constructor() {
		super({
		desc: 'Report a bug for the game.',
		group: 'bugs',
		name: 'report',
		usage: '<prefix>report'
		});
	}

	public async action(message: Message): Promise<Message | Message[]> {
		// Find the correct guild storage
		const mainGuildId: string = await this.client.storage.get('mainGuildId');
		const guild: Guild = message.guild || this.client.guilds.get(mainGuildId);
		const guildStorage: GuildStorage = mainGuildId ? this.client.storage.guilds.get(mainGuildId) : guild ? guild.storage : null;
		if (!guildStorage) { return message.reply('I was unable to find the guild storage. Please make sure the bot has correctly been configured.'); }
		// Setup
		const author: User = message.author;
		const questions: string[] = (await guildStorage.get(GuildStorageKeys.questions)) || [];
		const reportsChannelId: string = await guildStorage.get(GuildStorageKeys.reportsChannelId);
		const reportsChannel: TextChannel = (message.client.channels.get(reportsChannelId) as TextChannel);
		const reportEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`${author.username}#${author.discriminator} (${author.id})`, author.displayAvatarURL())
			.setColor('#7289DA')
			.setThumbnail(author.displayAvatarURL())
			.setTimestamp(new Date());
		const questionEmbed: MessageEmbed = new MessageEmbed()
			.setColor('#7289DA')
			.setFooter('Type [q]uit to cancel anytime')
			.setDescription(questions[0]);

		// Verify command can go through
		if (!questions[0]) { return message.reply('it seems this has not yet been setup for you server.'); }
		if (!reportsChannel) { return message.reply('it seems this server has not yet set their bug reports channel.'); }

		// Message the user
		if (message.channel.type !== 'dm') { await message.reply("I'm sending you a DM. Please continue the bug report there."); }
		try { await author.send({ embed: questionEmbed }); }
		catch {	return message.reply('it seems you have direct messages disabled. You\'ll have to enable your direct messages for me to message you.');}
		
		// Collect responses
		const filter: CollectorFilter = (m: Message) => m.author.id === author.id;
		const options: MessageCollectorOptions = {};
		const collector: MessageCollector = new MessageCollector(author.dmChannel, filter, options)
			.on('collect', (msg: Message) => this.onCollect(msg, collector, reportEmbed, questionEmbed, questions))
			.on('end', async (collected: Collection<string, Message>, reason: string) => this.onEnd(reason, message, guild, reportEmbed, reportsChannel));
	}

	// Handle the collector's 'collect' event.
	public async onCollect(
			message: Message, 
			collector: MessageCollector, 
			reportEmbed: MessageEmbed,
			questionEmbed: MessageEmbed,
			questions: string[]) {
		const contentLowercased: string = message.content.toLocaleLowerCase();
		const quit: boolean = contentLowercased.startsWith('quit') || contentLowercased === 'q';
		if (quit) { return collector.stop('quit'); }
		else { 
			reportEmbed.addField(questions[0], message.content);
			message.react('✅');
			questions.shift();
			if (!questions[0]) { return collector.stop('done'); }
			questionEmbed.setDescription(questions[0]);
			message.author.send({ embed: questionEmbed});
		}
	}

	// Handle the collector's 'end' event.
	public async onEnd(
			reason: string, 
			message: Message,
			guild: Guild,
			reportEmbed: MessageEmbed,
			reportsChannel: TextChannel ) {
		if (reason === 'quit') { return message.author.send('Bug report has been cancelled.'); }

		try {
			// Unique ID for the report
			const identifier: string = uniqid();
			const author: User = message.author;

			// Send the report
			await author.send(`Thank you ${author}, your report has been sent!`);
			reportEmbed.setFooter(`To edit: ${await this.client.getPrefix(guild)}edit ${identifier}`);
			const reportMessage: Message = await reportsChannel.send(reportEmbed) as Message;
			await reportMessage.react('👍');
			await reportMessage.react('👎');
			
			// Save the report
			const responses: IResponse[] = reportEmbed.fields.map((f: EmbedField) => ({ question: f.name, response: f.value } as IResponse));
			const report: IBugReport = {
				author: {
					avatar: author.displayAvatarURL(),
					disc: author.discriminator,
					id: author.id,
					username: author.username,
				},
				date: new Date().getDate(),
				identifier,
				messageId: reportMessage.id,
				responses
			};
			
			await this.client.reports.set(report.identifier, report);
		} catch (err) {
			this.logger.error('an error has occurred while saving: ', err);
			message.author.send(`An error has occurred wile saving: ${err.message}`);
		}
	}
}