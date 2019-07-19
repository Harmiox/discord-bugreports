import { Command, Message, Middleware } from '@yamdbf/core';
import { using } from '@yamdbf/core/bin/command/CommandDecorators';
import { Collection, MessageEmbed, TextChannel } from 'discord.js';
import { BugReportsClient } from '../../client/bugreports-client';
import { IBugReport } from '../../config/interfaces/report.interface';
import { AppLogger } from '../../util/app-logger';

/**
 * Edit Command
 */

 export default class extends Command<BugReportsClient> {
		private logger: AppLogger = new AppLogger('EditCommand');

		public constructor() {
			super({
			desc: 'Edit your bug report.',
			group: 'Bugs',
			hidden: true,
			name: 'edit',
			usage: '<prefix>edit <id>'
			});
		}

		@using(Middleware.resolve('id: String'))
		@using(Middleware.expect('id: String'))
		public async action(message: Message, [id]: [string]): Promise<Message | Message[]> {
			const report: IBugReport = await this.client.reports.get(id);
			if (!report) { return message.reply('that report was not found.'); }

			return message.reply('report editing is not yet supported.');
		}
 }