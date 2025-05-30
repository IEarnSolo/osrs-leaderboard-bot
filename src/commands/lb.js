import { SlashCommandBuilder } from 'discord.js';
import { postLeaderboard } from '../leaderboardJob.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lb')
    .setDescription('Post the current leaderboard.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await postLeaderboard(interaction.client);
      await interaction.editReply('✅ Leaderboard posted.');
    } catch (err) {
      console.error('Error posting leaderboard:', err);
      await interaction.editReply('❌ Failed to post leaderboard.');
    }
  }
};
