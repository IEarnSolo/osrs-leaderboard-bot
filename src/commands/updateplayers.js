const { SlashCommandBuilder } = require('discord.js');
const { GuildSettings } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('updateplayers')
    .setDescription('Set the interval (in hours) for updating player data.')
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
