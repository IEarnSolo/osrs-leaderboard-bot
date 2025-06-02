import { SlashCommandBuilder } from 'discord.js';
import { GuildSettings } from '../../utils/database.js'; // Adjust path as needed

export default {
  data: new SlashCommandBuilder()
    .setName('linkgroup')
    .setDescription('Link a Wise Old Man group to this Discord guild')
    .addStringOption(option =>
      option.setName('groupid')
        .setDescription('Wise Old Man group ID')
        .setRequired(true)),

  async execute(interaction) {
    const groupId = interaction.options.getString('groupid');
    const guildId = interaction.guild.id;

    try {
      const [settings, created] = await GuildSettings.findOrCreate({ where: { guildId } });
      settings.groupId = groupId;
      await settings.save();

      await interaction.reply(`✅ Group ID \`${groupId}\` linked successfully!`);
    } catch (error) {
      console.error(error);
      await interaction.reply('❌ Failed to link group. Please try again later.');
    }
  }
};
