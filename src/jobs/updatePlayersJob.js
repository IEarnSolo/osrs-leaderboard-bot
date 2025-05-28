import { WOMClient } from '@wise-old-man/utils';
import { GuildSettings } from '../utils/database.js';

const womClient = new WOMClient();

export async function updatePlayers(client, isMidnightUpdate = false, specificGuildId = null) {
  const guilds = specificGuildId
    ? [await client.guilds.fetch(specificGuildId)]
    : client.guilds.cache.values();

  for (const guild of guilds) {
    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings) continue;

    const leaderboardRole = guild.roles.cache.find(role => role.name === 'Leaderboard');
    if (!leaderboardRole) continue;

    for (const member of leaderboardRole.members.values()) {
      const username = member.nickname || member.displayName || member.user.username;
      try {
        await womClient.players.updatePlayer(username);
        await new Promise(res => setTimeout(res, 3000)); // Delay to respect rate limits
      } catch (error) {
        console.error(`Error updating player ${username}:`, error);
      }
    }
  }
}
