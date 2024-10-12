const { DataTypes } = require('sequelize');
const db = require('../utils/db');
const User = require('./user');

const Event = db.define('Event', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  event_datetime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  max_attendees: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CANCELED'),
    allowNull: false
  },
});

User.hasMany(Event, { foreignKey: 'organizerId' });
Event.belongsTo(User, { as: 'organizer', foreignKey: 'organizerId' });

module.exports = Event;