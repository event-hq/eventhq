const { gql } = require('apollo-server');
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type AuthPayload {
    token: String!
  }

  enum EventStatus {
    ACTIVE
    CANCELED
  }

  type Event {
    id: ID!
    name: String!
    category: String!
    event_datetime: String!
    public: Boolean!
    max_attendees: Int!
    attendee_count: Int
    status: EventStatus!
    organizer: User!
  }

  type PaginatedEvents {
    total_count: Int! 
    page_count: Int!   # Number of events returned in this query
    offset: Int!        # The offset used for this query
    events: [Event]!    # The list of events
  }

  type Registration {
    id: ID!
    registeredEvent: Event!
    attendee: User!
    registration_datetime: String!
    approval_status: Boolean!
  }

  type Query {
    getUser(id: ID!): User
    getAllUsers: [User]
    getEvent(id: ID!): Event
    getAllEvents(max_results: Int, offset: Int, category: String, name: String): PaginatedEvents!
    getMyEvents(max_results: Int, offset: Int): PaginatedEvents!
    getUserRegistrations: [Registration]
    getAllRegistrations: [Registration]
    getEventRegistrations(eventId: ID!): [Registration]
  }

  type Mutation {
    registerUser(name: String!, email: String!, password: String!): User

    loginUser(email: String!, password: String!): AuthPayload!

    updateUser(name: String!, email: String!): User

    deleteUser: Boolean

    createEvent(
      name: String!,
      category: String,
      event_datetime: String!,
      public: Boolean!,
      max_attendees: Int!
    ): Event!

    updateEvent(
      eventId: ID!,
      name: String,
      category: String,
      event_datetime: String,
      public: Boolean,
      max_attendees: Int
    ): Event!

    cancelEvent(eventId: ID!): Event!

    registerForEvent(eventId: ID!): Registration!

    approveRegistration(registrationId: ID!): Registration!

    cancelRegistration(registrationId: ID!): Boolean!
  }
`;

module.exports = typeDefs;