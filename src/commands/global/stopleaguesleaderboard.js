import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { LeaguesLeaderboard } from '../../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stopleaguesleaderboard')
    .setDescription('Disable leagues leaderboard(s) for this server')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Which leaderboard to stop')
        .setRequired(true)
        .addChoices(
          { name: 'League Points', value: 'points' },
          { name: 'First 99s', value: 'first99s' },
          { name: 'Both', value: 'both' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const type = interaction.options.getString('type');

    await interaction.deferReply({ ephemeral: true });

    try {
      const settingsList = await LeaguesLeaderboard.findAll({
        where: { guildId }
      });

      if (!settingsList.length) {
        return interaction.editReply('⚠️ No leagues leaderboard is set up.');
      }

      let updatedCount = 0;

      for (const settings of settingsList) {
        let changed = false;

        if (type === 'points' || type === 'both') {
          if (settings.enabledLeaguePointsLeaderboard) {
            settings.enabledLeaguePointsLeaderboard = false;
            changed = true;
          }
        }

        if (type === 'first99s' || type === 'both') {
          if (settings.enabledFirst99Leaderboard) {
            settings.enabledFirst99Leaderboard = false;
            changed = true;
          }
        }

        if (changed) {
          await settings.save();
          updatedCount++;
        }
      }

      if (updatedCount === 0) {
        return interaction.editReply('⚠️ Selected leaderboard(s) are already disabled.');
      }

      await interaction.editReply(
        `🛑 Disabled ${type === 'both' ? 'all leaderboards' : type} for this server.`
      );

      console.log(`[Leagues] Disabled (${type}) for guild ${interaction.guild.name}`);

    } catch (error) {
      console.error('[Leagues] Error stopping leaderboard:', error);

      await interaction.editReply(
        '❌ There was an error disabling the leagues leaderboard.'
      );
    }
  },
};