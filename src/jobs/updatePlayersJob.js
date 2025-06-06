import { WOMClient } from '@wise-old-man/utils';
import { GuildSettings } from '../utils/database.js';
import 'dotenv/config';

const womClient = new WOMClient({
  apiKey: process.env.WOM_API_KEY,
  userAgent: 'iearnsolo'
});

export async function updatePlayers(client, isMidnightUpdate = false, specificGuildId = null) {
  const startTime = Date.now();
  const failedPlayers = [];

  const guilds = specificGuildId
    ? [await client.guilds.fetch(specificGuildId)]
    : client.guilds.cache.values();

  for (const guild of guilds) {
    const settings = await GuildSettings.findOne({ where: { guildId: guild.id } });
    if (!settings) continue;

    await guild.roles.fetch();
    await guild.members.fetch();

    const leaderboardRole = guild.roles.cache.find(role => role.name === 'Leaderboard');
    if (!leaderboardRole) continue;

    for (const member of leaderboardRole.members.values()) {
      const username = member.nickname || member.displayName || member.user.username;
      console.log(`[Update] Attempting to update player: ${username}`);

      let success = false;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await womClient.players.updatePlayer(username);
          console.log(`[Update] Successfully updated player: ${username}`);
          success = true;
          break;
        } catch (error) {
          const status = error?.response?.status || error.response.status;
          const message = error?.response?.data?.message || error.message;

          if (attempt < 4) {
            console.warn(`[Update] Failed to update player ${username} (Attempt ${attempt}/4). Status: ${status || 'N/A'} | Message: ${message}. Retrying in 5 seconds...`);
            await new Promise(res => setTimeout(res, 5000));
          } else {
            console.error(`[Update] Failed to update player ${username} after 4 attempts. Status: ${status || 'N/A'} | Message: ${message}. Skipping.`);
            failedPlayers.push(username);
          }
        }
      }

      await new Promise(res => setTimeout(res, 1000)); // Rate limit delay
    }
  }

  const endTime = Date.now();
  const durationSec = (endTime - startTime) / 1000;

  const durationStr =
    durationSec < 60
      ? `${durationSec.toFixed(2)} seconds`
      : `${Math.floor(durationSec / 60)}m ${Math.round(durationSec % 60)}s`;

  console.log(`[Update] Finished all player updates in ${durationStr}.`);

  if (failedPlayers.length > 0) {
    console.log(`[Update] ${failedPlayers.length} players failed to update. Fetching latest update times...`);

    for (const username of failedPlayers) {
      try {
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

      await new Promise(res => setTimeout(res, 500));
    }
  } else {
    console.log('[Update] No failed players to report.');
  }
}