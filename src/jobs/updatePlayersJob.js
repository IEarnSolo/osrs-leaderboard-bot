import { womClient } from '../utils/womClient.js';
import { GuildSettings } from '../utils/database.js';
import { parseISO, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, formatDistanceToNow } from 'date-fns';
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

    const leaderboardMembersUsernames = new Set(
      leaderboardRole.members.map(member =>
        (member.nickname || member.displayName || member.user.username)
          .toLowerCase()
          .replaceAll(/[_-]/g, ' ')
      )
    );

    const filteredPlayers = groupPlayers.filter(entry =>
      leaderboardMembersUsernames.has(
        entry.username.toLowerCase().replaceAll(/[_-]/g, ' ')
      )
    );

    for (const player of filteredPlayers) {
      const username = player.username;

      const lastChanged = typeof player.lastChangedAt === 'string'
        ? parseISO(player.lastChangedAt)
        : player.lastChangedAt instanceof Date
          ? player.lastChangedAt
          : null;

      const lastUpdated = typeof player.updatedAt === 'string'
        ? parseISO(player.updatedAt)
        : player.updatedAt instanceof Date
          ? player.updatedAt
          : null;

      const now = new Date();
      let shouldUpdate = true;

      if (lastChanged && lastUpdated) {
        const yearsSinceChange = differenceInYears(now, lastChanged);
        const monthsSinceChange = differenceInMonths(now, lastChanged);
        const weeksSinceChange = differenceInWeeks(now, lastChanged);

        const daysSinceLastUpdate = differenceInDays(now, lastUpdated);
        const weeksSinceLastUpdate = differenceInWeeks(now, lastUpdated);

        if (yearsSinceChange >= 1) {
          shouldUpdate = weeksSinceLastUpdate >= 2;
        } else if (monthsSinceChange >= 6) {
          shouldUpdate = weeksSinceLastUpdate >= 1;
        } else if (monthsSinceChange >= 1) {
          shouldUpdate = daysSinceLastUpdate >= 5;
        } else if (weeksSinceChange >= 1) {
          shouldUpdate = daysSinceLastUpdate >= 1;
        } else {
          shouldUpdate = true;
        }
      }

      if (!shouldUpdate) {
        console.log(`[Update] Skipping ${username} -
        Last changed: (${formatDistanceToNow(lastChanged)} ago) |
        Last updated: (${formatDistanceToNow(lastUpdated)} ago)`);
        continue;
      }

      console.log(`[Update] Attempting to update player: ${username}`);
      let success = false;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await womClient.players.updatePlayer(username);
          console.log(`[Update] Successfully updated player: ${username}`);
          success = true;
          break;
        } catch (error) {
          const status = error?.response?.status || error?.status;
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

    const failedUpdateLogs = [];

    for (const username of failedPlayers) {
      try {
        const player = await womClient.players.getPlayerDetails(username);
        const updatedAt = player.updatedAt
          ? new Date(player.updatedAt).toLocaleString('en-US', {
              timeZone: process.env.TIMEZONE || 'UTC',
              hour12: true
            })
          : 'Never';

        const logLine = `- ${username}: last updated at ${updatedAt}`;
        console.log(logLine);
        failedUpdateLogs.push(logLine);
      } catch (error) {
        const errorMsg = `Failed to fetch updatedAt for ${username}: ${error.message}`;
        console.error(errorMsg);
        failedUpdateLogs.push(`- ${username}: failed to fetch updatedAt`);
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
        console.warn(`[Update] Could not send failed update list - channel not found or not text-based.`);
      }
    } catch (err) {
      console.error('[Update] Error sending failed update list to Discord:', err);
    }
  }
} else {
  console.log('[Update] No failed players to report.');
}
}