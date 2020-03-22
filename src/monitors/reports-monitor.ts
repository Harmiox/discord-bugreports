import { 
	Collection, 
	CollectorFilter, 
	EmbedField, 
	Guild, 
	Message, 
	MessageCollector, 
	MessageCollectorOptions, 
	MessageEmbed, 
	TextChannel, 
	User } from 'discord.js';
import { 
	KlasaMessage, 
	Monitor, 
	MonitorStore,
	Provider} from 'klasa';
import uniqid from 'uniqid';
import ReportsClient from '../client/reports-client';
import { IBugReport, IResponse } from '../config/interfaces/report.interface';
import { AppLogger } from '../util/app-logger';

/**
 * Reports Monitor
 */

export default class ReportsMonitor extends Monitor {
	private logger: AppLogger = new AppLogger('ReportsMonitor');
	private reportsClient: ReportsClient;
	private activeConversations: Map<string, User> = new Map<string, User>();

	constructor(client: ReportsClient, store: MonitorStore, file: string[], directory: string) {
		super(client, store, file, directory, {
			name: 'reportsMonitor',
			ignoreOthers: false,
			ignoreBots: true,
			ignoreSelf: true,
			ignoreEdits: true,
			ignoreWebhooks: true,
			ignoreBlacklistedUsers: true,
			ignoreBlacklistedGuilds: true
		});
		this.reportsClient = client;
	}

	public async run(message: KlasaMessage): Promise<void> {
		if (message.channel.type !== 'dm') { return; }
		if (this.activeConversations.get(message.author.id)) { return; }
		this.activeConversations.set(message.author.id, message.author);
		await message.channel.send('Are you wanting to start a report? *(Respond with **yes** or **y** to start one)*');
		const filter: CollectorFilter = (m: Message) => m.author.id === message.author.id;
		message.channel.awaitMessages(filter, { max: 1, time: 10000, errors: ['time'] })
			.then((collected: Collection<string, Message>) => {
				const msg: Message = collected.first();
				const contentLowercased: string = msg.content.toLocaleLowerCase();
				if (contentLowercased.startsWith('yes') || contentLowercased === 'y') {
					return this.newReport(message);
				} else {
					this.activeConversations.delete(message.author.id);
					return message.channel.send("No problem, but feel free to message me any time you do want to make a report!");
				}
			})
			.catch((_collected: Collection<string, Message>) => {
				this.activeConversations.delete(message.author.id);
				return message.channel.send("It looks like you're not there. Have a good day!");
			});
	}

	public async init(): Promise<void> {
		this.logger.info('Reports Monitor has been initialized.');
	}

	// TODO: To add when adding the ability to edit reports.
	private async prompt(message: KlasaMessage): Promise<KlasaMessage> {
		return message;
	}

	// Start a new report
	private async newReport(message: KlasaMessage): Promise<KlasaMessage> {
		// Get the main guild and it's settings.
		const mainGuildId: string = this.reportsClient.config.reports.mainGuildID;
		const guild: Guild = this.client.guilds.resolve(mainGuildId);
		if (!guild) { return message.reply('unable to find main guild.') as Promise<KlasaMessage>; }

		// Pre-Creeate the MessageEmbed's
		const author: User = message.author;
		const questions: string[] = [].concat(this.reportsClient.config.reports.questions);
		const reportsChannelId: string = this.reportsClient.config.reports.reportsChannelID;
		const reportsChannel: TextChannel = (guild.channels.resolve(reportsChannelId) as TextChannel);
		if (!reportsChannel) { return message.channel.send('I was unable to find the reports channel.') as Promise<KlasaMessage>; }
		const reportEmbed: MessageEmbed = new MessageEmbed()
			.setAuthor(`${author.username}#${author.discriminator} (${author.id})`, author.displayAvatarURL())
			.setColor('#7289DA')
			.setThumbnail(author.displayAvatarURL())
			.setTimestamp(new Date());
		const questionEmbed: MessageEmbed = new MessageEmbed()
			.setColor('#7289DA')
			.setFooter('Type [q]uit to cancel anytime')
			.setDescription(questions[0]);
		
		// Collect responses
		const filter: CollectorFilter = (m: Message) => m.author.id === author.id;
		const options: MessageCollectorOptions = {};
		const collector: MessageCollector = new MessageCollector(author.dmChannel, filter, options)
			.on('collect', (msg: Message) => this.onCollect(msg, collector, reportEmbed, questionEmbed, questions))
			.on('end', async (collected: Collection<string, Message>, reason: string) => this.onEnd(reason, message, reportEmbed, reportsChannel));

		// Start the report
		try {
			await author.send({ embed: questionEmbed });
		} catch (e) {
			collector.stop();
			this.logger.error('Error when starting report: ', e);
		}
	}

	// Handle the collector's 'collect' event.
	public async onCollect(message: Message, collector: MessageCollector, reportEmbed: MessageEmbed, questionEmbed: MessageEmbed, questions: string[]) {
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
	public async onEnd(reason: string, message: Message, reportEmbed: MessageEmbed, reportsChannel: TextChannel ) {
		this.activeConversations.delete(message.author.id);
		try {
			if (reason === 'quit') { return message.author.send('Bug report has been cancelled.'); }
			// Unique ID for the report
			const identifier: string = uniqid();
			const author: User = message.author;

			// Send the report to the reports channel
			reportEmbed.setFooter(`ID: ${identifier}`);
			const reportMessage: Message = await reportsChannel.send(reportEmbed) as Message;
			await reportMessage.react('👍');
			await reportMessage.react('👎');
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

			// Save the report into database
			const provider: Provider = this.client.providers.default;
			await provider.create('reports', report.identifier, report);

			// Thanks <3
			message.channel.send(`Thank you, your report has been sent!`);
		} catch (err) {
			// Uh oh
			this.logger.error('an error has occurred while saving: ', err);
			message.channel.send(`An error has occurred wile saving: ${err.message}`);
		}
	}

	// Edit an existing report via report ID
	private async editReport(message: KlasaMessage): Promise<KlasaMessage> {
		return message;
	}
} 