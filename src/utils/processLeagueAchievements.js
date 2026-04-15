export function processLeagueAchievements(achievements, settings) {
  const bestBySkill = new Map();

  const playerCounts = {};

  for (const [key, value] of Object.entries(settings.dataValues)) {
    if (!value) continue;
    if (key === 'overall') continue;

    playerCounts[value] = (playerCounts[value] || 0) + 1;
  }

  for (const achievement of achievements) {
    const { name, metric, createdAt } = achievement;

    const skill = metric?.toLowerCase();
    if (!skill) continue;

    const is99 = name.startsWith('99 ');
    const isMax = name === 'Maxed Overall';
    if (!is99 && !isMax) continue;

    if (settings[skill]) continue;

    const existing = bestBySkill.get(skill);

    if (!existing || new Date(createdAt) < new Date(existing.createdAt)) {
      bestBySkill.set(skill, achievement);
    }
  }

  const updates = [];

    const sorted = Array.from(bestBySkill.entries())
        .sort((a, b) => new Date(a[1].createdAt) - new Date(b[1].createdAt));

    for (const [skill, achievement] of sorted) {
    const playerName = achievement.player.displayName;

    const isOverall = skill === 'overall';

    if (!isOverall) {
      const count = playerCounts[playerName] || 0;

      if (count >= 2) {
        console.log(`[Leagues] Skipping ${playerName} for ${skill} (already has 2 skills)`);
        continue;
      }

      playerCounts[playerName] = count + 1;
    }

    updates.push({
      skill,
      player: playerName
    });
  }

  return updates;
}