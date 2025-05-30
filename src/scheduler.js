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

    let isUpdating = false;

    cron.schedule('* * * * *', async () => {
      if (isUpdating) return;

      isUpdating = true;

      try {
        const now = new Date();
        const currentHour = now.getUTCHours();
        if (currentHour === 0) return; // Skip 00:00 UTC for leaderboards

        const settings = await GuildSettings.findAll();
        const sortedSettings = settings
          .filter(s => s.updateIntervalHours)
          .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

        for (const setting of sortedSettings) {
          const hoursSinceUpdate = (now - new Date(setting.updatedAt)) / (1000 * 60 * 60);

          if (hoursSinceUpdate >= setting.updateIntervalHours) {
            console.log(`🔄 Updating guild ${setting.guildId} (last updated ${hoursSinceUpdate.toFixed(2)}h ago)`);

            setting.updatedAt = new Date();
            setting.changed('updatedAt', true);
            await setting.save();

            await updatePlayers(client, false, setting.guildId);

            break; // Only update 1 guild per minute
          }
        }
      } catch (error) {
        console.error('Error during scheduled update:', error);
      } finally {
        isUpdating = false;
      }
    });
};
