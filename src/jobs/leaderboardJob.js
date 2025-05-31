import { WOMClient, Period, Metric } from '@wise-old-man/utils';
import { GuildSettings } from '../utils/database.js';
import { EmbedBuilder } from 'discord.js';
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
      const groupGainsResponse = await womClient.groups.getGroupGains(settings.groupId,
      { period: Period.DAY, metric: Metric.OVERALL },
      { limit: 40 }
      );

      const groupPlayers = groupGainsResponse || [];

        const leaderboardMembersUsernames = new Set(
          leaderboardRole.members.map(member =>
            (member.nickname || member.displayName || member.user.username).toLowerCase()
          )
        );

        const filteredPlayers = groupPlayers.filter(entry =>
          leaderboardMembersUsernames.has(entry.player.username.toLowerCase())
        );

      console.log('groupGainsResponse:', groupGainsResponse);
      console.log('Discord Leaderboard Members:', Array.from(leaderboardMembersUsernames));
      console.log('WOM Group Players:', groupPlayers.map(p => p.username));


      // Sort by gained XP desc
      filteredPlayers.sort((a, b) => b.data.gained - a.data.gained);

      const top10 = filteredPlayers.slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle('🏆 Top 10 Overall XP Gains (Past 24h)')
        .setColor(0xFFD700)
        //.setTimestamp()
        //.setFooter({ text: 'Powered by Wise Old Man' })
        .setDescription(
          top10
            .map((entry, index) => {
              return `**${index + 1}.** ${entry.player.displayName} — ${entry.data.gained.toLocaleString()} XP`;
            })
            .join('\n')
        );

      await channel.send({ embeds: [embed] });


    } catch (error) {
      console.error(`Failed to fetch or post leaderboard for guild ${guild.id}:`, error);
    }
  }
}