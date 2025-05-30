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
    cron.schedule('*/10 * * * *', async () => {
      const now = new Date();
      const currentHour = now.getUTCHours();
      if (currentHour === 0) return; // Still skip midnight UTC for leaderboards

      const settings = await GuildSettings.findAll();

      for (const setting of settings) {
        const lastUpdated = new Date(setting.updatedAt);
        const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

        if (setting.updateIntervalHours && hoursSinceUpdate >= setting.updateIntervalHours) {
          console.log(`🔄 Updating guild ${setting.guildId} (last updated ${hoursSinceUpdate.toFixed(2)}h ago)`);
          await updatePlayers(client, false, setting.guildId);
          setting.changed('updatedAt', true);
          await setting.save(); // Will update `updatedAt`
        }
      }
    });

};
