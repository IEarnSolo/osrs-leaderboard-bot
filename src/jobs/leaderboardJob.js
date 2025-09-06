import { Metric, Period } from '@wise-old-man/utils';
import { EmbedBuilder } from 'discord.js';
import 'dotenv/config';
import { GuildSettings } from '../utils/database.js';
import { womClient } from '../utils/womClient.js';

export async function sendLeaderboardReminder(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.leaderboardChannelId) continue;

    const channel = guild.channels.cache.get(settings.leaderboardChannelId);
    if (!channel) continue;

    await guild.roles.fetch();
    const leaderboardRole = guild.roles.cache.find(role => role.name === 'Leaderboard');
    if (!leaderboardRole) continue;

    try {
      await channel.send(`<@&${leaderboardRole.id}> The daily leaderboard will be posted shortly. Please log out if you want your XP updated.`);
      console.log(`[Reminder] Sent daily leaderboard reminder in guild ${guild.name}`);
    } catch (error) {
      console.error(`[Reminder] Failed to send reminder in guild ${guild.name}:`, error);
    }
  }
}

export async function postLeaderboard(client, channel = null) {
  // If a specific channel is provided (e.g., from a slash command), infer the guild from it
  if (channel) {
    const guild = channel.guild;

    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.groupId) return;

    await guild.roles.fetch();
    await guild.members.fetch();

    const leaderboardRole = guild.roles.cache.find(role => role.name === 'Leaderboard');
    if (!leaderboardRole) return;

    try {
      // Fetch top 60 group gains
      const groupGainsResponse = await womClient.groups.getGroupGains(
        settings.groupId,
        { period: Period.DAY, metric: Metric.OVERALL },
        { limit: 60 }
      );

      const groupPlayers = groupGainsResponse || [];

      const leaderboardMembersUsernames = new Set(
        leaderboardRole.members.map(member =>
          (member.nickname || member.displayName || member.user.username)
            .toLowerCase()
            .replaceAll(/[_-]/g, ' ')
        )
      );

      const filteredPlayers = groupPlayers.filter(entry =>
        leaderboardMembersUsernames.has(
          entry.player.username.toLowerCase().replaceAll(/[_-]/g, ' ')
        )
      );

      /*console.log('groupGainsResponse:', groupGainsResponse);
      console.log('Discord Leaderboard Members:', Array.from(leaderboardMembersUsernames));
      console.log('WOM Group Players:', groupPlayers.map(p => p.username));*/

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
      console.log(`[Leaderboard] Posted leaderboard in guild ${guild.name}`);

    } catch (error) {
      console.error(`Failed to post leaderboard in command channel for guild ${guild.id}:`, error);
    }

    return; // Don't continue to the full guild loop
  }

  // Loop through all guilds if no specific channel was provided
  for (const guild of client.guilds.cache.values()) {
    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings || !settings.leaderboardChannelId || !settings.groupId) continue;

    const channel = guild.channels.cache.get(settings.leaderboardChannelId);
    if (!channel) continue;

    await postLeaderboard(client, channel);
  }
}