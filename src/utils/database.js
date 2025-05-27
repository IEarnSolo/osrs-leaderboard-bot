const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false,
});

const GuildSettings = sequelize.define('GuildSettings', {
  guildId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  leaderboardChannelId: DataTypes.STRING,
  updateIntervalHours: DataTypes.INTEGER,
});

module.exports = { sequelize, GuildSettings };
