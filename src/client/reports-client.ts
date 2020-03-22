import { KlasaClient, Schema } from 'klasa';
import { IConfig } from '../config/interfaces/config.interface';
import { AppLogger } from '../util/app-logger';

/**
 * Reports Client
 */

export default class ReportsClient extends KlasaClient {
	private logger: AppLogger = new AppLogger('ReportsClient');
	private disconnects: number = 0;

	constructor(public config: IConfig) {
		super({
			ownerID: config.discord.ownerUserID,
			prefix: config.discord.prefix,
      production: false,
      providers: { default: 'mongodb', 'mongodb': {
				connectionString: `mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.database}`
			} },
			readyMessage: 'ReportsClient Is Ready',
			typing: true
		});

		// Bind events to local client methods
		this.on('ready', this.onReady);
		this.on('warn', this.onWarn);
		this.on('error', this.onError);
		this.on('shardDisconnect', this.onDisconnect);
		this.on('shardReconnecting', this.onReconnecting);
	}

	private async onReady() {
		this.user.setPresence({ activity: { name: 'DM to report bug!' } });
		this.logger.info(`${this.guilds.cache.size} guild(s) are in cache.`);
	}

	private onWarn(info: {}): void {
    this.logger.warn('Discord warning: ', info);
  }
	
	private onError(error: Error): void {
		this.logger.error('Client Error', error);
	}

	private onDisconnect(event: CloseEvent): void {
		this.logger.warn(`${this.logger.context} has been disconnected.`);
		this.disconnects += 1;
    this.logger.warn(`[DICONNECT:${event.code}] ${event.reason}`);
    if (event.code === 1000) {
			this.logger.warn('Disconnect with event code 1000. Exiting process...');
			process.exit();
    }
    if (this.disconnects >= 10) {
      this.logger.warn(`${this.disconnects} failed attempts on reconnecting. Exiting process...`);
    }
    this.logger.warn(`[ATTEMPT:${this.disconnects}] Attempting to login again...`);
    this.login(this.token).catch(err => {
			this.logger.info(`[ERROR] Error when attempting to login after disconnect.\n${err}`);
      process.exit();
    });
  }

  private onReconnecting(): void {
    this.logger.warn(`${this.logger.context} is reconnecting.`);
  }

}