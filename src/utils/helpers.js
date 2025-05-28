/**
 * Extracts an OSRS username from a Discord member.
 * Falls back from nickname → display name → username.
 */
export function getOSRSUsername(member) {
  return member?.nickname || member?.displayName || member?.user?.username;
}
