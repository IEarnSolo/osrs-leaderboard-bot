import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

// Parse flags
const isDev = process.argv.includes('--dev');
const isClear = process.argv.includes('--clear');

// Set up REST client
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Load command files unless clearing
const commands = [];
if (!isClear) {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const { default: command } = await import(path.join(commandsPath, file));
    if (command && command.data) {
      commands.push(command.data.toJSON());
    }
  }
}

async function deploy() {
  try {
    if (isDev) {
      const route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);

      if (isClear) {
        console.log('🧹 Clearing guild commands...');
        await rest.put(route, { body: [] });
        console.log(`✅ Cleared all guild commands from GUILD_ID: ${GUILD_ID}`);
      } else {
        console.log(`🚀 Deploying ${commands.length} guild command(s)...`);
        await rest.put(route, { body: commands });
        console.log(`✅ Successfully deployed guild commands`);
      }

    } else {
      const route = Routes.applicationCommands(CLIENT_ID);

      if (isClear) {
        console.log('🧹 Clearing global commands...');
        await rest.put(route, { body: [] });
        console.log(`✅ Cleared all global commands`);
      } else {
        console.log(`🌍 Deploying ${commands.length} global command(s)...`);
        await rest.put(route, { body: commands });
        console.log(`✅ Successfully deployed global commands`);
      }
    }

  } catch (error) {
    console.error('❌ Error during deployment:', error);
  }
}

deploy();
