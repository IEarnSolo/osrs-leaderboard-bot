import cron from 'node-cron';
import { updatePlayers } from './jobs/updatePlayersJob.js';
import { postLeaderboard } from './jobs/leaderboardJob.js';
import { GuildSettings } from './utils/database.js';

export default (client) => {
  // Schedule leaderboard posting at 00:00 UTC
  cron.schedule('0 0 * * *', async () => {
    await updatePlayers(client, true); // true indicates it's the 00:00 UTC update
    await postLeaderboard(client);
  }, {
    timezone: 'UTC',
  });

  // Schedule player updates based on each guild's interval
  setInterval(async () => {
    const settings = await GuildSettings.findAll();
    const now = new Date();
    const currentHour = now.getUTCHours();

    for (const setting of settings) {
      if (setting.updateIntervalHours && currentHour % setting.updateIntervalHours === 0 && currentHour !== 0) {
        await updatePlayers(client, false, setting.guildId);
      }
    }
  }, 60 * 60 * 1000); // Check every hour
};
