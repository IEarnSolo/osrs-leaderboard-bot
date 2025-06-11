import { parseISO, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, formatDistanceToNow } from 'date-fns';

/**
 * Determine if a player should be updated based on activity recency and last update.
 * If not, logs the reason and returns false.
 *
 * @param {Date | string | null} lastChangedAt - When the player's data last changed (WOM).
 * @param {Date | string | null} lastUpdatedAt - When the player's data was last updated by your bot.
 * @param {string} displayName - Display name used in logs.
 * @param {Date} [now=new Date()] - Optional override for current time.
 * @returns {boolean} - Whether the player should be updated.
 */
export function shouldUpdatePlayer(lastChangedAt, lastUpdatedAt, displayName, now = new Date()) {
  const lastChanged = typeof lastChangedAt === 'string' ? parseISO(lastChangedAt) : lastChangedAt;
  const lastUpdated = typeof lastUpdatedAt === 'string' ? parseISO(lastUpdatedAt) : lastUpdatedAt;

  if (!(lastChanged instanceof Date) || isNaN(lastChanged) ||
      !(lastUpdated instanceof Date) || isNaN(lastUpdated)) {
    return true; // No valid data, always update
  }

  const yearsSinceChange = differenceInYears(now, lastChanged);
  const monthsSinceChange = differenceInMonths(now, lastChanged);
  const weeksSinceChange = differenceInWeeks(now, lastChanged);

  const daysSinceLastUpdate = differenceInDays(now, lastUpdated);
  const weeksSinceLastUpdate = differenceInWeeks(now, lastUpdated);

  let shouldUpdate;

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

  if (!shouldUpdate) {
    console.log(
      `[Update] Skipping ${displayName} - Last changed: (${formatDistanceToNow(lastChanged)} ago) | Last updated: (${formatDistanceToNow(lastUpdated)} ago)`
    );
  }

  return shouldUpdate;
}