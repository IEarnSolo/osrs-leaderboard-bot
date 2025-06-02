import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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



export { sequelize, GuildSettings };
