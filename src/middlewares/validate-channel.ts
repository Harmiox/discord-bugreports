import { Client, Message } from '@yamdbf/core';
import { GuildStorageKeys } from '../config/enums/guild-storage.enum';

export async function checkChannelPermissions(
  message: Message,
  args: any[],
  client: Client
// @ts-ignore
): Promise<[Message, any[]]> {
	// Is an Owner
	if (client.owner.indexOf(message.author.id) >= 0) { return [message, args]; }
	// Direct Message
	if (message.channel.type === 'dm') { return [message, args]; }
	// Guild
	if (message.guild) {
		const commandsChannelId: string = await message.guild.storage.get(GuildStorageKeys.commandsChannelId);
		// Isn't restricted to a single channel
		if (!commandsChannelId) { return [message, args]; }
		// Is in allowed channel
		if (message.channel.id === commandsChannelId) { return [message, args]; }
	}
}
