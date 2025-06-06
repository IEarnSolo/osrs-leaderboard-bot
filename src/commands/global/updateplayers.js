import { SlashCommandBuilder } from 'discord.js';
import { GuildSettings } from '../../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('updateplayers')
    .setDescription('Set the interval (in hours) for auto-updating Wise Old Man profiles of members with Leaderboard role')
    .addIntegerOption(option =>
      option.setName('interval')
        .setDescription('Update interval in hours')
        .setRequired(true)),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const interval = interaction.options.getInteger('interval');

    await GuildSettings.upsert({
      guildId,
      updateIntervalHours: interval,
    });

    await interaction.reply(`Player update interval set to ${interval} hour(s).`);
  },
};
