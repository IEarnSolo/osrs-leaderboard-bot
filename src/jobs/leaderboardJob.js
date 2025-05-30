import { WOMClient } from '@wise-old-man/utils';
import { GuildSettings } from '../utils/database.js';
import 'dotenv/config';

const womClient = new WOMClient({
  apiKey: process.env.WOM_API_KEY,
  userAgent: 'iearnsolo'
});

export async function postLeaderboard(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.leaderboardChannelId || !settings.groupId) continue;

    const channel = guild.channels.cache.get(settings.leaderboardChannelId);
    if (!channel) continue;

    await guild.roles.fetch();
    await guild.members.fetch();

    const leaderboardRole = guild.roles.cache.find(role => role.name === 'Leaderboard');
    if (!leaderboardRole) continue;

    try {
      // Fetch top 40 group gains
      const groupGainsResponse = await womClient.groups.getGroupGains(settings.groupId, {
        metric: 'overall',
        period: 'day',
        limit: 40,
      });

      const groupPlayers = groupGainsResponse?.data?.players || [];

      // Filter by members with the leaderboard role
      const leaderboardMembersUsernames = new Set(
        leaderboardRole.members.map(member => (member.nickname || member.displayName || member.user.username).toLowerCase())
      );

      // Match players to leaderboard members, case-insensitive
      const filteredPlayers = groupPlayers.filter(player =>
        leaderboardMembersUsernames.has(player.username.toLowerCase())
      );

      // Sort by gained XP desc
      filteredPlayers.sort((a, b) => b.gained - a.gained);

      const top10 = filteredPlayers.slice(0, 10);

      let message = '__**Top 10 Overall XP Gains (Last Day):**__\n\n';
      top10.forEach((entry, index) => {
        message += `**${index + 1}.** ${entry.username} - ${entry.gained.toLocaleString()} XP\n`;
      });

      await channel.send(message);

    } catch (error) {
      console.error(`Failed to fetch or post leaderboard for guild ${guild.id}:`, error);
    }
  }
}