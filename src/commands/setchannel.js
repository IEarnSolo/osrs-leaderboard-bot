import { SlashCommandBuilder } from 'discord.js';
import { GuildSettings } from '../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('setchannel')
  .setDescription('Set the leaderboard channel to the current channel.');

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  await GuildSettings.upsert({
    guildId,
    leaderboardChannelId: channelId,
  });

  await interaction.reply(`Leaderboard channel set to <#${channelId}>.`);
}
