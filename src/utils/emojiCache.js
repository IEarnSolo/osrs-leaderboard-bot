export const emojiMap = new Map();

export async function loadSkillEmojis(client) {
  const emojis = await client.application.emojis.fetch();

  for (const emoji of emojis.values()) {
    emojiMap.set(emoji.name.toLowerCase(), `<:${emoji.name}:${emoji.id}>`);
  }
}