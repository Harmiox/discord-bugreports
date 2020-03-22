export interface IConfig {
	discord: {
		token: string;
		prefix: string;
		ownerUserID: string;
		playing: string;
	};
	mongo: {
		host: string;
		port: number;
		database: string;
	};
	reports: {
		mainGuildID: string;
		reportsChannelID: string;
		questions: string[];
	};
}