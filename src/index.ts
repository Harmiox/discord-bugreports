import { BugReportsClient } from './client/bugreports-client';
import { ConfigService } from './config/config.service';
import { AppLogger} from './util/app-logger';

const logger: AppLogger = new AppLogger('Main');
const config: ConfigService = new ConfigService();

async function bootstrap(): Promise<void> {
	const test: string = 'Test string';
	logger.info('Initiating Echo Client');
	logger.info(`${Date.now()}`);

	const client: BugReportsClient = new BugReportsClient(config);
  client.start();
}

process.on("unhandledRejection", error => {
	logger.error("Unhandled promise rejection:", error);
});

bootstrap();