import { WOMClient } from '@wise-old-man/utils';
import { GuildSettings } from '../utils/database.js';

const womClient = new WOMClient();

export async function postLeaderboard(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.leaderboardChannelId) continue;

    const channel = guild.channels.cache.get(settings.leaderboardChannelId);
    if (!channel) continue;

    const leaderboardRole = guild.roles.cache.find(role => role.name === 'Leaderboard');
    if (!leaderboardRole) continue;

    const leaderboard = [];

    for (const member of leaderboardRole.members.values()) {
      const username = member.nickname || member.displayName || member.user.username;
      try {
        const data = await womClient.players.getPlayerGains(username, { period: 'day' });
        const xp = data?.data?.skills?.overall?.experience?.gained || 0;
        leaderboard.push({ username, xp });
        await new Promise(res => setTimeout(res, 3000)); // Delay to respect rate limits
      } catch (error) {
        console.error(`Error fetching gains for ${username}:`, error);
      }
    }

    leaderboard.sort((a, b) => b.xp - a.xp);
    const top10 = leaderboard.slice(0, 10);

    let message = '__**Top 10 Overall XP Gains (Last Day):**__\n\n';
    top10.forEach((entry, index) => {
      message += `**${index + 1}.** ${entry.username} - ${entry.xp.toLocaleString()} XP\n`;
    });

    await channel.send(message);
  }
}
