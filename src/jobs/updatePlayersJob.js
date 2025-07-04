import { womClient } from '../utils/womClient.js';
import { GuildSettings } from '../utils/database.js';
import { shouldUpdatePlayer } from '../utils/shouldUpdatePlayer.js';
import 'dotenv/config';

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

    // Fetch group details from WOM
    let groupPlayers = [];
    try {
      const groupDetails = await womClient.groups.getGroupDetails(settings.groupId);
      groupPlayers = groupDetails.memberships.map(m => m.player);
    } catch (error) {
      console.error(`[Update] Failed to fetch group details for guild ${guild.name}:`, error.message);
      continue;
    }

    const leaderboardNameMap = new Map(
      leaderboardRole.members.map(member => {
        const discordName = member.nickname || member.displayName || member.user.username;
        const normalizedName = discordName.toLowerCase().replace(/[_-]/g, ' ');
        return [normalizedName, discordName];
      })
    );

    const filteredPlayers = groupPlayers.filter(entry =>
      leaderboardNameMap.has(entry.username.toLowerCase().replace(/[_-]/g, ' '))
    );

    for (const player of filteredPlayers) {
      const username = player.username;
      const normalizedUsername = username.toLowerCase().replace(/[_-]/g, ' ');
      const displayName = leaderboardNameMap.get(normalizedUsername) || username;

      const shouldUpdate = shouldUpdatePlayer(player.lastChangedAt, player.updatedAt, displayName);
      if (!shouldUpdate) continue;

      console.log(`[Update] Attempting to update player: ${displayName}`);
      let success = false;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await womClient.players.updatePlayer(username);
          console.log(`[Update] Successfully updated player: ${displayName}`);
          success = true;
          break;
        } catch (error) {
          const status = error?.response?.status || error?.status;
          const message = error?.response?.data?.message || error.message;

          if (attempt < 4) {
            console.error(`[Update] Failed to update player ${displayName} (Attempt ${attempt}/4). Status: ${status || 'N/A'} | Message: ${message}. Retrying in 5 seconds...`);
            await new Promise(res => setTimeout(res, 5000));
          } else {
            console.error(`[Update] Failed to update player ${displayName} after 4 attempts. Status: ${status || 'N/A'} | Message: ${message}. Skipping.`);
            failedPlayers.push(displayName);
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

    const failedUpdateLogs = [];

    for (const username of failedPlayers) {
      const normalizedUsername = username.toLowerCase().replace(/[_-]/g, ' ');
      const displayName = username;
      try {
        const player = await womClient.players.getPlayerDetails(normalizedUsername);
        const updatedAt = player.updatedAt
          ? new Date(player.updatedAt).toLocaleString('en-US', {
              timeZone: process.env.TIMEZONE || 'UTC',
              hour12: true
            })
          : 'Never';

        const logLine = `- ${displayName}: last updated at ${updatedAt}`;
        console.log(logLine);
        failedUpdateLogs.push(logLine);
      } catch (error) {
        const errorMsg = `Failed to fetch updatedAt for ${displayName}: ${error.message}`;
        console.error(errorMsg);
        failedUpdateLogs.push(`- ${displayName}: failed to fetch updatedAt`);
      }

      await new Promise(res => setTimeout(res, 500)); // slight delay for rate-limiting
    }
  // If UTC time is midnight (00:00), send the list to the Discord channel
  const utcHour = new Date().getUTCHours();
  if (utcHour === 0) {
    try {
      const channelId = '1292425572433268818';
      const channel = await client.channels.fetch(channelId);

      if (channel && channel.isTextBased()) {
        const messageChunks = [];

        let chunk = `🛑 **${failedPlayers.length} Players Failed to Update for leaderboard**\n`;
        for (const line of failedUpdateLogs) {
          if ((chunk + line + '\n').length > 1900) {
            messageChunks.push(chunk);
            chunk = '';
          }
          chunk += line + '\n';
        }
        if (chunk.length) messageChunks.push(chunk);

        for (const msg of messageChunks) {
          await channel.send(msg);
        }
      } else {
        console.error(`[Update] Could not send failed update list - channel not found or not text-based.`);
      }
    } catch (err) {
      console.error('[Update] Error sending failed update list to Discord:', err);
    }
  }
} else {
  console.log('[Update] No failed players to report.');
}
}