import { dirname, join } from 'path';
import { DataTypes, Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';

// Emulate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: join(__dirname, '../../database.sqlite'),
  logging: false,
});

const GuildSettings = sequelize.define('GuildSettings', {
  guildId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  leaderboardChannelId: DataTypes.STRING,
  updateIntervalHours: DataTypes.INTEGER,
  lastPlayerUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  groupId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

const LeaguesLeaderboard = sequelize.define('LeaguesLeaderboard', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  guildId: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  leagueGroupId: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  leagueLeaderboardChannelId: DataTypes.STRING,
  leaguePointsMessageId: DataTypes.STRING,
  leagueFirst99MessageId: DataTypes.STRING,

  enabledLeaguePointsLeaderboard: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  enabledFirst99Leaderboard: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  overall: DataTypes.STRING,
  attack: DataTypes.STRING,
  defence: DataTypes.STRING,
  strength: DataTypes.STRING,
  hitpoints: DataTypes.STRING,
  ranged: DataTypes.STRING,
  prayer: DataTypes.STRING,
  magic: DataTypes.STRING,
  cooking: DataTypes.STRING,
  woodcutting: DataTypes.STRING,
  fletching: DataTypes.STRING,
  fishing: DataTypes.STRING,
  firemaking: DataTypes.STRING,
  crafting: DataTypes.STRING,
  smithing: DataTypes.STRING,
  mining: DataTypes.STRING,
  herblore: DataTypes.STRING,
  agility: DataTypes.STRING,
  thieving: DataTypes.STRING,
  slayer: DataTypes.STRING,
  farming: DataTypes.STRING,
  runecrafting: DataTypes.STRING,
  hunter: DataTypes.STRING,
  construction: DataTypes.STRING,
  sailing: DataTypes.STRING,
}, {
  timestamps: true,
});

export { GuildSettings, LeaguesLeaderboard, sequelize };

