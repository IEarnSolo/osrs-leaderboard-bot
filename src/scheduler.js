import cron from 'node-cron';
import { updatePlayers } from './jobs/updatePlayersJob.js';
import { sendLeaderboardReminder } from './jobs/leaderboardJob.js';
import { postLeaderboard } from './jobs/leaderboardJob.js';
import { GuildSettings } from './utils/database.js';

export default (client) => {

  cron.schedule('55 23 * * *', () => {
    sendLeaderboardReminder(client);
  }, {
    timezone: 'UTC'
  });

  // Schedule leaderboard posting at 00:00 UTC
  cron.schedule('0 0 * * *', async () => {
    await updatePlayers(client);
    await postLeaderboard(client);
  }, {
    timezone: 'UTC',
  });

    let isUpdating = false;

    cron.schedule('* * * * *', async () => {
      const now = new Date();
      const currentHour = now.getUTCHours();
      if (currentHour === 0) return; // Skip 00:00 UTC for leaderboards

      if (isUpdating) return;
      isUpdating = true;

      try {
        const settings = await GuildSettings.findAll();
        const sortedSettings = settings
          .filter(s => s.updateIntervalHours)
          .sort((a, b) => new Date(a.lastPlayerUpdate) - new Date(b.lastPlayerUpdate));

        for (const setting of sortedSettings) {
          const lastUpdate = setting.lastPlayerUpdate || new Date(0);
          const hoursSinceUpdate = (now - new Date(lastUpdate)) / (1000 * 60 * 60);

          if (hoursSinceUpdate >= setting.updateIntervalHours) {
            console.log(`🔄 Updating guild ${setting.guildId} (last updated ${hoursSinceUpdate.toFixed(2)}h ago)`);

            setting.lastPlayerUpdate = new Date();
            setting.changed('lastPlayerUpdate', true);
            await setting.save();

            await updatePlayers(client, setting.guildId);
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
