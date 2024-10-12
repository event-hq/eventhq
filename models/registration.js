const { DataTypes } = require('sequelize');
const db = require('../utils/db');
const User = require('./user');
const Event = require('./event');

const Registration = db.define('Registration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,  // Ensure auto-increment for the primary key
  },
  registration_datetime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW, // Automatically set to the current date/time
  },
  approval_status: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Default to false (not approved)
  },
});

// Associations
User.belongsToMany(Event, {
  through: Registration,
  foreignKey: 'attendeeId',
  as: 'registeredEvent', // Alias for user events
});

Event.belongsToMany(User, {
  through: Registration,
  foreignKey: 'eventId',
  as: 'attendee', // Alias for event attendees
});

Registration.belongsTo(Event, { foreignKey: 'eventId', as: 'registeredEvent' });
Registration.belongsTo(User, { foreignKey: 'attendeeId', as: 'attendee' });


module.exports = Registration;