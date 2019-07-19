export interface IBugReport {
	author: IAuthor;
	date: number;
	identifier: string;
	messageId: string;
	responses: IResponse[];
}

export interface IResponse {
	question: string;
	response: string;
}

export interface IAuthor {
	avatar: string;
	disc: string;
	id: string;
	nickname?: string;
	username: string;
}