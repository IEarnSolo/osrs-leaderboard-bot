export function processLeagueAchievements(achievements, settings) {
  const achievementsBySkill = new Map();
  const playerCounts = {};

  // 🧠 Step 1: Count existing 99s (excluding overall)
  for (const [key, value] of Object.entries(settings.dataValues)) {
    if (!value) continue;
    if (key === 'overall') continue;

    playerCounts[value] = (playerCounts[value] || 0) + 1;
  }

  // 🧠 Step 2: Group ALL valid achievements by skill
  for (const achievement of achievements) {
    const { name, metric } = achievement;

    const skill = metric?.toLowerCase();
    if (!skill) continue;

    const is99 = name.startsWith('99 ');
    const isMax = name === 'Maxed Overall';
    if (!is99 && !isMax) continue;

    if (settings[skill]) continue;

    if (!achievementsBySkill.has(skill)) {
      achievementsBySkill.set(skill, []);
    }

    achievementsBySkill.get(skill).push(achievement);
  }

  const updates = [];

  // 🧠 Step 3: Process each skill independently
  for (const [skill, list] of achievementsBySkill.entries()) {
    // Sort earliest → latest
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const achievement of list) {
      const playerName = achievement.player.displayName;
      const isOverall = skill === 'overall';

      if (!isOverall) {
        const count = playerCounts[playerName] || 0;

        if (count >= 2) {
          console.log(`[Leagues] Skipping ${playerName} for ${skill} (already has 2 skills)`);
          continue; // 👉 try NEXT player
        }

        playerCounts[playerName] = count + 1;
      }

      // ✅ First valid player wins
      updates.push({
        skill,
        player: playerName
      });

      break; // 👉 stop after first valid player
    }
  }

  return updates;
}