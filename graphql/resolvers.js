const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('../utils/authenticate');
const { Sequelize } = require('sequelize');
const User = require('../models/user');
const Event = require('../models/event');
const Registration = require('../models/registration');

const resolvers = {
  Query: {
    async getUser(parent, { id }) {
      try {
        const user = await User.findByPk(id);
        return user;
      } catch (error) {
        throw new Error('Error fetching user');
      }
    },

    async getAllUsers() {
      try {
        const users = await User.findAll();
        return users;
      } catch (error) {
        console.log(error)
        throw new Error('Error fetching all users');
        
      }
    },

    async getEvent(parent, { id }) {
      try {
        const event = await Event.findOne({
          where: { id },
          include: [
            { model: User, as: 'organizer' }, // Include the event organizer
            {
              model: User,
              as: 'attendee', // Include attendees
              through: { attributes: [] }, // Exclude attributes from the junction table
            },
          ],
        });

        // If the event doesn't exist, handle it accordingly
        if (!event) {
          throw new Error('Event not found');
        }

        // Calculate attendee count
        event.attendee_count = event.attendee.length; // Assuming 'attendees' is populated correctly

        return event;
      } catch (error) {
        console.error('Error fetching event:', error);
        throw new Error('Error fetching event');
      }
    },

    async getAllEvents(parent, { max_results = 10, offset = 0, category, name }) {
      try {
        const whereCondition = {};

        // Add where condition for case-insensitive match on category
        if (category) {
          whereCondition.category = { [Sequelize.Op.iLike]: category };
        }

        // Add where condition for case-insensitive partial match on name
        if (name) {
          whereCondition.name = { [Sequelize.Op.iLike]: `%${name}%` };
        }

        const total_count = await Event.count({ where: whereCondition });

        const events = await Event.findAll({
          where: whereCondition,
          include: [
            { model: User, as: 'organizer' },
            {
              model: User,
              as: 'attendee',
              through: { attributes: [] },
            },
          ],
          order: [['id', 'ASC']], // Order by eventId
          limit: max_results,
          offset: offset,
        });

        // Map through events to calculate attendee_count for each event
        const eventsWithCounts = events.map(event => {
          event.attendee_count = event.attendee.length;
          return event;
        });

        return {
          total_count,
          page_count: events.length,
          offset,
          events: eventsWithCounts
        };

      } catch (error) {
        console.log(error)
        throw new Error('Error fetching all events', error);
        
      }
    },

    async getMyEvents(parent, { max_results = 10, offset = 0 }, { req }) {
      try {
        const userId = authenticate(req);

        const total_count = await Event.count({
          where: { organizerId: userId },
        });

        const events = await Event.findAll({
          where: { organizerId: userId },
          include: [
            { model: User, as: 'organizer' },
            {
              model: User,
              as: 'attendee',
              through: { attributes: [] },
            },
          ],
          order: [['id', 'ASC']],
          limit: max_results,
          offset: offset,
        });

        // Map through events to calculate attendee_count for each event
        const eventsWithCounts = events.map(event => {
          event.attendee_count = event.attendee.length;
          return event;
        });

        return {
          total_count,
          page_count: events.length,
          offset,
          events: eventsWithCounts
        };
      } catch (error) {
        console.log('Error fetching my events:', error)
        throw error;
        
      }
    },

    async getUserRegistrations(parent, args, { req }) {
      try {
        const userId = authenticate(req);  // Authenticate user and get user ID

        // Find all the user's registrations
        const registrations = await Registration.findAll({
          where: { attendeeId: userId },
          include: [
            { 
              model: Event, 
              as: 'registeredEvent', 
              include: [
                { model: User, as: 'organizer' },
                { model: User, as: 'attendee', through: { attributes: [] } },
              ]
            },
            {
              model: User,
              as: 'attendee'
            }
          ]
        });

        // Calculate the attendee count for each event
        const registrationsWithAttendeeCounts = registrations.map(registration => {
          const event = registration.registeredEvent;

          // Calculate attendee count
          event.attendee_count = event.attendee.length; // Assuming attendees are properly populated

          return registration;
        });

        return registrationsWithAttendeeCounts;

      } catch (error) {
        console.error('Error fetching registered events:', error);
        throw error;
      }
    },

    async getAllRegistrations() {
      try {
        const registrations = await Registration.findAll({
          include: [
            { model: Event, as: 'registeredEvent', include: [{ model: User, as: 'organizer' }] },
            { model: User, as: 'attendee' }
          ]
        });

        return registrations;
      } catch (error) {
        console.log(error)
        throw new Error('Error fetching all events', error);
        
      }
    },

    async getEventRegistrations(parent, { eventId }, { req }) {
      try {
        const userId = authenticate(req);

        // Fetch the event and check if the user is the organizer
        const event = await Event.findOne({
          where: { id: eventId },
          include: [
            {
              model: User,
              as: 'organizer',
              where: { id: userId },
            },
          ],
        });

      // If the event doesn't exist or the user is not the organizer, handle it
      if (!event) {
        throw new Error('Event not found or you are not authorized to view it.');
      }

      // Fetch all registrations for the event
      const registrations = await Registration.findAll({
        where: { eventId },
        include: [
          {
            model: User,
            as: 'attendee',
          },
          {
            model: Event,
            as: 'registeredEvent',
            include: [{ model: User, as: 'organizer' }]
          },
        ],
      });

      // Return the list of attendees
      return registrations;
      } catch (error) {
        console.error('Error fetching registrations:', error);
        throw error;
      }
    },



  },

  Mutation: {
    async registerUser(parent, { name, email, password }) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });
        return user;
      } catch (error) {
        console.log('Error creating user:', error);
        throw new Error('Error creating user');
      }
    },

    async loginUser(parent, { email, password }) {
      try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new Error('User not found');
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error('Invalid password');
        }

        // Generate JWT token for user.id
        const token = jwt.sign({ userId: user.id }, 'temporary_secret', { expiresIn: '12h' });
        return { token };
      } catch (error) {
        console.log('Error logging in:', error);
        throw error;
      }
    },

    async updateUser(parent, { name, email }, { req }) {
      try {
        const id = authenticate(req);
        const user = await User.findByPk(id);
        if (!user) {
          throw new Error('User not found');
        }
        user.name = name;
        user.email = email;
        await user.save();
        return user;
      } catch (error) {
        console.log('Error updating user:', error);
        throw error;
      }
    },

    async deleteUser(parent, args, { req }) {
      try {
        const id = authenticate(req);
        const user = await User.findByPk(id);
        if (!user) {
          throw new Error('User not found');
        }

        deleted = await user.destroy();
        if (deleted){
          return true;
        } else {
          throw new Error('User could not be deleted')
        }

      } catch (error) {
        console.log('Error deleting user:', error);
        throw error;
      }
    },

    async createEvent(parent, { name, category, event_datetime, public, max_attendees }, { req }) {
      try {
        const userId = authenticate(req);  // Authenticate user and get user ID

        // Create the event, linking it to the authenticated user
        const event = await Event.create({
          name,
          category,
          event_datetime,  // Assume the string is ISO-8601 format and Sequelize will handle it
          public,
          max_attendees,
          status: 'ACTIVE', // Events are active when created
          organizerId: userId  // Link to the authenticated user
        });

         // Fetch the event again to include the organizer
        const eventWithOrganizer = await Event.findByPk(event.id, {
          include: [{ model: User, as: 'organizer' }] 
        });

        return eventWithOrganizer;
      } catch (error) {
        console.log('Error creating event:', error);
        throw error;
      }
    },

    async updateEvent(parent, { eventId, name, category, event_datetime, public, max_attendees }, { req }) {
      try {
        const userId = authenticate(req);  // Authenticate user and get user ID

        // Find the existing event
        const event = await Event.findByPk( eventId );

        // If the event doesn't exist, throw an error
        if (!event) {
          throw new Error('Event not found');
        }

        // Check if the authenticated user is the organizer of the event
        if (event.organizerId !== userId) {
          throw new Error('You are not authorized to update this event');
        }

        // Update only the fields that are provided
        const updatedFields = {};
        if (name !== undefined) updatedFields.name = name;
        if (category !== undefined) updatedFields.category = category;
        if (event_datetime !== undefined) updatedFields.event_datetime = event_datetime;
        if (public !== undefined) updatedFields.public = public;
        if (max_attendees !== undefined) updatedFields.max_attendees = max_attendees;

        await Event.update(updatedFields, { where: { id: eventId } });

         // Fetch the updated event
        const updatedEvent = await Event.findByPk( eventId, {
          include: [
            { model: User, as: 'organizer' },
            {
              model: User,
              as: 'attendee',
              through: { attributes: [] },
            },
          ],
        });

        // Set the attendee_count based on the number of attendees
        updatedEvent.attendee_count = updatedEvent.attendee.length;

        return updatedEvent;

      } catch (error) {
        console.log('Error creating event:', error);
        throw error;
      }
    },

    async cancelEvent(parent, { eventId }, { req }) {
      try {
        const userId = authenticate(req);  // Authenticate user and get user ID

        // Find the existing event
        const event = await Event.findByPk( eventId );

        // If the event doesn't exist, throw an error
        if (!event) {
          throw new Error('Event not found');
        }

        // Check if the authenticated user is the organizer of the event
        if (event.organizerId !== userId) {
          throw new Error('You are not authorized to cancel this event');
        }

        await Event.update({status: 'CANCELED'}, { where: { id: eventId } });

         // Fetch the updated event
        const updatedEvent = await Event.findByPk( eventId, {
          include: [
            { model: User, as: 'organizer' },
            {
              model: User,
              as: 'attendee',
              through: { attributes: [] },
            },
          ],
        });

        // Set the attendee_count based on the number of attendees
        updatedEvent.attendee_count = updatedEvent.attendee.length;

        return updatedEvent;

      } catch (error) {
        console.log('Error canceling event:', error);
        throw error;
      }
    },

    async registerForEvent(parent, { eventId }, { req }) {
      try {
        const userId = authenticate(req);

        // Fetch the event to get max_attendees
        const event = await Event.findOne({
          where: { id: eventId },
          include: [
            {
              model: User,
              as: 'attendee',
              through: { attributes: [] }
            }
          ]
        });

        if (!event) {
          throw new Error('Event not found');
        }

        if (event.status == 'CANCELED') {
          throw new Error('Registration failed: Event is canceled.');
        }

        // Check if the user is already registered for the event
        const existingRegistration = await Registration.findOne({
          where: {
            eventId,
            attendeeId: userId,
          },
        });

        if (existingRegistration) {
          throw new Error('Registration failed: User is already registered for this event.');
        }

        // Check if the number of attendees has reached the max_attendees limit
        if (event.attendee.length >= event.max_attendees) {
          throw new Error('Registration failed: Maximum attendees reached for this event.');
        }


        // Create a new registration for the event
        const registration = await Registration.create({
          eventId,
          attendeeId: userId,
          registration_datetime: new Date(),  // Set current date/time
          approval_status: event.public ? true : false, // Auto-approve if public event
        });

        console.log("registration:", registration)
        console.log("registration.id:", registration.id)


        // Fetch the complete registration with associated Event and User
        const completeRegistration = await Registration.findOne({
          where: { id: registration.id },
          include: [
            { model: Event, as: 'registeredEvent' },   // Include the Event
            { model: User, as: 'attendee' },  // Include the User
          ],
        });

        return completeRegistration; // Return the complete registration object
      } catch (error) {
        console.error('Error registering for event:', error);
        throw error;
      }
    },


    async approveRegistration(parent, { registrationId }, { req }) {
      try {
        const userId = authenticate(req);

        // Fetch the registration to check its associated event
        const registration = await Registration.findOne({
          where: { id: registrationId },
          include: [
            {
              model: Event,
              as: 'registeredEvent',
              include: [
                {
                  model: User,
                  as: 'organizer',
                },
              ],
            },
            {
              model: User,
              as: 'attendee',
            },
          ],
        });

        // If the registration or event is not found, handle it accordingly
        if (!registration || !registration.registeredEvent) {
          throw new Error('Registration not found or associated event does not exist.');
        }

        // Check if the authenticated user is the organizer
        if (registration.registeredEvent.organizer.id !== userId) {
          throw new Error('You are not authorized to approve this registration.');
        }

        // Update the registration to set approval_status to true
        registration.approval_status = true;
        await registration.save();
        
        return registration;
      } catch (error) {
        console.error('Error approving registration:', error);
        throw error;
      }
    },


    async cancelRegistration(parent, { registrationId }, { req }) {
      try {
        const userId = authenticate(req);

        // Find the registration
        const registration = await Registration.findOne({
          where: { id: registrationId },
          include: [
            {
              model: Event,
              as: 'registeredEvent',
              include: [
                { model: User, as: 'organizer' }
              ]
            }
          ]
        });

        if (!registration) {
          throw new Error('Registration not found');
        }

        const event = registration.registeredEvent;

        // Check if the user is either the attendee or the organizer
        if (userId !== registration.attendeeId && userId !== event.organizer.id) {
          throw new Error('You do not have permission to cancel this registration.');
        }

        // Check if the event is more than 24 hours in the future
        const currentTime = new Date();
        const eventTime = new Date(event.event_datetime);
        const timeDifference = eventTime - currentTime; // Difference in milliseconds

        if (timeDifference <= 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
          throw new Error("Registration must be canceled more than 24 hours before the event.");
        }

        // Delete the registration
        await registration.destroy();

        return true; //Successfully canceled
      } catch (error) {
        console.error('Error canceling registration:', error);
        throw error;
      }
    },


  },

}

module.exports = resolvers;