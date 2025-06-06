import { womClient } from '../utils/womClient.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Collection } from 'discord.js';
import { sequelize } from './utils/database.js';
import scheduler from './scheduler.js';
import client from './config/client.js';
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
    const { default: command } = await import(path.join(folderPath, file));
    if (command && command.data && command.data.name) {
      client.commands.set(command.data.name, command);
    }
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await sequelize.sync();
  scheduler(client);
  try {
          const username = 'I Earn Solo';
          const player = await womClient.players.getPlayerDetails(username);
          const updatedAt = player.updatedAt
            ? new Date(player.updatedAt).toLocaleString('en-US', {
                timeZone: process.env.TIMEZONE || 'UTC',
                hour12: true
              })
            : 'Never';

          console.log(`- ${username}: last updated at ${updatedAt}`);
        } catch (error) {
          console.error(`Failed to fetch updatedAt for ${username}:`, error.message);
        }
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
