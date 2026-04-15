import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { startFirst99s, startLeagueLeaderboard } from '../../jobs/leaguesLeaderboardJob.js';
import { LeaguesLeaderboard } from '../../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('createleaguesleaderboard')
    .setDescription('Initialize leagues leaderboard systems')
    .addStringOption(option =>
      option
        .setName('group_id')
        .setDescription('Wise Old Man League Group ID')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('leaderboard_channel')
        .setDescription('Channel to post the leaderboard(s)')
        .setRequired(true)
    )
    .addChannelOption(option =>
    option
        .setName('announcements_channel')
        .setDescription('Channel for first 99s and Max announcements')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Which leaderboard to create')
        .setRequired(true)
        .addChoices(
          { name: 'League Points', value: 'points' },
          { name: 'First 99s', value: 'first99s' },
          { name: 'Both', value: 'both' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;

    const groupId = interaction.options.getString('group_id');
    const channel = interaction.options.getChannel('leaderboard_channel');
    const announcementsChannel = interaction.options.getChannel('announcements_channel');
    const type = interaction.options.getString('type');

    if (!channel.isTextBased()) {
      return interaction.reply({
        content: '❌ Please select a text channel.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let settings = await LeaguesLeaderboard.findOne({
        where: { guildId }
        });

        if (!settings) {
        settings = await LeaguesLeaderboard.create({
            guildId,
            leagueGroupId: groupId,
            leagueLeaderboardChannelId: channel.id,
            leagueAnnouncementsChannelId: announcementsChannel.id
        });
        } else {
        settings.leagueGroupId = groupId;
        settings.leagueLeaderboardChannelId = channel.id;
        settings.leagueAnnouncementsChannelId = announcementsChannel.id;
        }

        let created = [];

        if (type === 'points' || type === 'both') {
            settings.enabledLeaguePointsLeaderboard = true;

            const msg = await startLeagueLeaderboard(interaction.client, guild);
            if (msg) {
                settings.leaguePointsMessageId = msg.id;
                created.push('📊 League Points');
            }
        }

        if (type === 'first99s' || type === 'both') {
            settings.enabledFirst99Leaderboard = true;

            const msg = await startFirst99s(interaction.client, guild);
            if (msg) {
                settings.leagueFirst99MessageId = msg.id;
                created.push('🏆 First 99s');
            }
        }

        await settings.save();

      if (created.length === 0) {
        return interaction.editReply('❌ Failed to initialize leaderboard(s).');
      }

      await interaction.editReply(
        `✅ Created: ${created.join(', ')} in <#${channel.id}>`
      );

      console.log(`[Leagues] Initialized (${type}) for guild ${guild.name}`);

    } catch (error) {
      console.error('[Leagues] Error initializing:', error);

      await interaction.editReply(
        '❌ There was an error setting up the leagues leaderboard.'
      );
    }
  },
};