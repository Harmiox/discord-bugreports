import * as Joi from '@hapi/joi';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import ReportsClient from './client/reports-client';
import { AppLogger} from './util/app-logger';

const logger: AppLogger = new AppLogger('Main');

// Validate Config
const configFile: string = fs.readFileSync('./config.yaml', 'utf8');
const config: any = yaml.safeLoad(configFile);
const configSchema: Joi.ObjectSchema = Joi.object({
	discord: Joi.object({
		token: Joi.string().required(),
		prefix: Joi.string().default('!'),
		ownerUserID: Joi.string().required()
	}),
	mongo: Joi.object({
		host: Joi.string().default('localhost'),
		port: Joi.number().default(27017),
		database: Joi.string().default('reports_client')
	}),
	reports: Joi.object({
		mainGuildID: Joi.string().required(),
		reportsChannelID: Joi.string().required(),
		questions: Joi.array().items(Joi.string()).min(1).max(20).required()
	})
}).unknown();
const { error, value: validatedConfig } = configSchema.validate(config);
if (error) { throw new Error(`Config validation error: ${error.message}`); }

// Start the bot
async function bootstrap(): Promise<void> {
	logger.info('Initiating Reports Client');
	logger.info(`${Date.now()}`);

	const client: ReportsClient = new ReportsClient(validatedConfig);
  client.login(validatedConfig.discord.token);
}

// Unhandled Errors
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

bootstrap();