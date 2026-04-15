import { Collection } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import client from './config/client.js';
import scheduler from './scheduler.js';
import { sequelize } from './utils/database.js';
import { loadSkillEmojis } from './utils/emojiCache.js';
import './utils/logger.js';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const { default: command } = await import(pathToFileURL(filePath).href);

    if (command && command.data && command.data.name) {
      client.commands.set(command.data.name, command);
    }
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await loadSkillEmojis(client);
  await sequelize.sync();
  scheduler(client);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
