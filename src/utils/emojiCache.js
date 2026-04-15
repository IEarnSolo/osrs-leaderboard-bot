export const emojiMap = new Map();

export async function loadSkillEmojis(client) {
  const emojis = await client.application.emojis.fetch();

  for (const emoji of emojis.values()) {
    emojiMap.set(emoji.name.toLowerCase(), `<:${emoji.name}:${emoji.id}>`);
  }
}

export function formatSkill(skill) {
  const emoji = emojiMap.get(skill) || '▫️';

  const name =
    skill === 'overall'
      ? 'Maxed Overall'
      : skill.charAt(0).toUpperCase() + skill.slice(1);

  return { emoji, name };
}