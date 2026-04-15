import { Metric } from '@wise-old-man/utils';
import { EmbedBuilder } from 'discord.js';
import { LeaguesLeaderboard } from '../utils/database.js';
import { emojiMap } from '../utils/emojiCache.js';
import { processLeagueAchievements } from '../utils/processLeagueAchievements.js';
import { leaguesWomClient } from '../utils/womClient.js';

const leaderboardCache = new Map();

function buildLeaguePointsEmbed(highscores) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('🏆 League Points Leaderboard')
      .setDescription('Live league standings\nUpdates every 10 minutes.')
      .setColor(0x0099ff)
      .setTimestamp();

    highscores.slice(0, 20).forEach((entry, index) => {
      const { displayName } = entry.player;
      const { score, rank } = entry.data;
      const percentile = Math.round(entry.player.leaguePercentile * 100);

      embed.addFields({
        name: `#${index + 1} - ${displayName}`,
        value:
          `**Points:** ${score.toLocaleString()}\n` +
          `**Rank:** ${rank.toLocaleString()}\n` +
          `**Percentile:** Top ${percentile}%`,
        inline: false,
      });
    });

    return embed;

  } catch (error) {
    console.error('[Leagues] Error building embed:', error);

    return new EmbedBuilder()
      .setTitle('League Highscores')
      .setDescription('Error fetching league data.')
      .setColor(0xff0000)
      .setTimestamp();
  }
}

function buildFirst99Embed(settings) {
  const skills = [
    'overall','attack','defence','strength','hitpoints','ranged','prayer','magic',
    'cooking','woodcutting','fletching','fishing','firemaking','crafting','smithing',
    'mining','herblore','agility','thieving','slayer','farming','runecrafting',
    'hunter','construction','sailing'
  ];

  const lines = skills.map(skill => {
    const value = settings[skill];

    const emoji = emojiMap.get(skill) || '▫️';

    const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);

    return `${emoji} **${skillName}**: ${value || '—'}`;
  });

  return new EmbedBuilder()
    .setTitle('🏆 First to 99 & Maxed')
    .setDescription(lines.join('\n'))
    .setColor(0x00AE86)
    .setTimestamp();
}

/**
 * Starts or resumes league leaderboard tracking
 */
export async function startLeagueLeaderboard(client, guild) {
  const settings = await LeaguesLeaderboard.findOne({
    where: { guildId: guild.id }
  });

  if (!settings || !settings.leagueLeaderboardChannelId || !settings.leagueGroupId) {
    return;
  }

  const channel = await client.channels.fetch(settings.leagueLeaderboardChannelId);
  if (!channel || !channel.isTextBased()) return;

  let message;

  if (settings.leaguePointsMessageId) {
    try {
      message = await channel.messages.fetch(settings.leaguePointsMessageId);
    } catch {
      message = null;
    }
  }

  if (!message) {
    const embed = await buildLeaguePointsEmbed(settings.leagueGroupId);
    message = await channel.send({ embeds: [embed] });

    settings.leaguePointsMessageId = message.id;
    await settings.save();

    console.log(`[Leagues] Created new leaderboard message for guild ${guild.name}`);
  }

  return message;
}

export async function startFirst99s(client, guild) {
  const settings = await LeaguesLeaderboard.findOne({
    where: { guildId: guild.id }
  });

  if (!settings) return null;

  const channel = await client.channels.fetch(settings.leagueLeaderboardChannelId);
  if (!channel || !channel.isTextBased()) return null;

  const embed = buildFirst99Embed(settings);

  const message = await channel.send({ embeds: [embed] });

  settings.leagueFirst99MessageId = message.id;
  await settings.save();

  return message;
}

/**
 * Updates all league leaderboards (run every 10 min)
 */
export async function updateLeagueLeaderboards(client) {
  const allSettings = await LeaguesLeaderboard.findAll();

  for (const settings of allSettings) {
    if (!settings.enabledLeaguePointsLeaderboard) continue;

    try {
      const guild = await client.guilds.fetch(settings.guildId);
      const channel = await client.channels.fetch(settings.leagueLeaderboardChannelId);

      if (!channel || !channel.isTextBased()) continue;

      const message = await channel.messages.fetch(settings.leaguePointsMessageId);

      const highscores = await leaguesWomClient.groups.getGroupHiscores(
        settings.leagueGroupId,
        Metric.LEAGUE_POINTS
      );

      if (!highscores || highscores.length === 0) continue;

      const snapshot = highscores.slice(0, 20)
        .map(e => `${e.player.username}:${e.data.score}:${e.data.rank}`)
        .join('|');

      const cacheKey = `${settings.guildId}:${settings.leagueGroupId}`;
      const cached = leaderboardCache.get(cacheKey);

      if (cached === snapshot) {
        //console.log(`[Leagues] No changes for guild ${guild.name}, skipping`);
        continue;
      }

      const embed = buildLeaguePointsEmbed(highscores);

      await message.edit({ embeds: [embed] });

      leaderboardCache.set(cacheKey, snapshot);

      console.log(`[Leagues] Updated leaderboard for guild ${guild.name}`);

    } catch (error) {
      console.error(`[Leagues] Failed to update guild ${settings.guildId}:`, error.message);
    }
  }
}

export async function updateFirst99s(client) {
  const all = await LeaguesLeaderboard.findAll();

  for (const settings of all) {
    if (!settings.enabledFirst99Leaderboard) continue;
    if (!settings.leagueGroupId || !settings.leagueLeaderboardChannelId) continue;

    try {
      const achievements = await leaguesWomClient.groups.getGroupAchievements(
        settings.leagueGroupId,
        { limit: 50 }
      );

      const updates = processLeagueAchievements(achievements, settings);

      if (updates.length === 0) continue;

      for (const { skill, player } of updates) {
        settings[skill] = player;
        console.log(`[Leagues] ${player} achieved first 99 in ${skill}`);
      }

      await settings.save();

      const channel = await client.channels.fetch(settings.leagueLeaderboardChannelId);
      if (!channel || !channel.isTextBased()) continue;

      const message = await channel.messages.fetch(settings.leagueFirst99MessageId);
      if (!message) continue;

      const embed = buildFirst99Embed(settings);
      await message.edit({ embeds: [embed] });

    } catch (err) {
      console.error('[Leagues] Error updating first 99s:', err);
    }
  }
}