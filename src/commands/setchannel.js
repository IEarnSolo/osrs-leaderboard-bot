const { SlashCommandBuilder } = require('discord.js');
const { GuildSettings } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set the leaderboard channel to the current channel.'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;

    await GuildSettings.upsert({
      guildId,
      leaderboardChannelId: channelId,
    });

    await interaction.reply(`Leaderboard channel set to <#${channelId}>.`);
  },
};
