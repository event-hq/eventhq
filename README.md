# EventHQ

EventHQ is a GraphQL API tool for event management. 

## Current Status

EventHQ is functionally complete, and has full support for creating and managing users and events, as well as searching for and registering attendees. Its code needs some additional work to be production ready.

Implemented functionality includes:

* User registration
* Secure login, authorization, and authentication, using bcryptjs for password hashing, and JWT for token generation 
* User profile management
* Creating events
* Editing events
* Canceling events
* Viewing all events
* Searching for events by category (exact match) or event name (partial match)
* Registering for events, subject to maximum allowed attendees
* Managing registrations
* Approving attendees, for private events
* Canceling registrations, limited to no more than 24 hours before the event

To be ready for production, additional work is required on error handling, scalability, security, and automated testing and deployment. Data validation and error handling are currently limited.
* Errors are currently reported through the API response and include a stack trace, which is helpful during development by needs to be disabled for production.
* Authentication is handled with JWT bearer tokens, but it is not configured securely--the secret is currently in the code, and instead should be stored securely and copied to the server at runtime.
* Testing is not yet automated. The Usage Scenarios & Tests section below provides a foundation for integration tests, but they need to be coded.
* The application does not yet provide automated deployment.

## Getting Started

1. **Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)**
2. **Download and unzip EventHQ.zip**, which is provided as a zip to keep the project private. It can be added to GitHub if desired. For ease of setup, the zip contains the entire project and its dependencies, including the npm packages ``apollo-server``, ``pg``, ``dotenv,`` ``sequelize``, ``bcryptjs``, and ``jsonwebtoken``. 
3. **Run ``docker compose up``** from the root directory of the project
4. **Explore the graph with the interactive docs** Navigate to [http://localhost:3000/graphql](http://localhost:3000/graphql) in a web browser. 


## Code Structure and Files

``readme.md``
> This file, contains all documentation and sample usage scenarios.

``server.js``
> Top level code for the project, which initializes the GraphQL ApolloServer and routes requests to it.

``models/``
> Provides the data models for users, events, and regisrations. They are used to create and interacting with the database tables.

``graphql/``
> Contains the GraphQL type definitions, as well as the resolver code for queries and mutations.

``utils/``
> Contains utility functions for authentication and database setup.

``Dockerfile``
> Packages the GraphQL server into a Docker container

``docker-compose.yml``
> Sets up the server and databse, and orchestrates their interaction.

``wait-for-it.sh``
> A utility shell script, used to ensure the server waits until the database is ready before starting.

## Tech Stack

EventHQ uses the following technologies

* GraphQL -- API interface
* Node.js -- Runtime environment for the EventHQ Javascript API application
* apollo-server -- GraphQL server for Node.js
* sequelize -- ORM for building and interacting with the postgresql database
* postgresql -- Database for all persistent data
* Docker -- Both the Node.js and postgresql servers are deployed in Docker containers and orchestrated with Docker Compose

## Usage Scenarios & Tests

The following scenarios demonstrate how to use the various features of EventsHQ. They also will be used as test cases when automating tests.

### Users
**Create an account**
This API can be used to create new accounts for users.

**``request``**

    mutation RegisterUser {
      registerUser(name: "Frodo Baggins", email: "frodo@theshire.net", password: "Und3rh!ll") {
        id
        name
        email
      }
    }

**``response``**

    {
      "data": {
        "registerUser": {
          "id": "1",
          "name": "Frodo Baggins",
          "email": "frodo@theshire.net"
        }
      }
    }

**Log In**
Generates the Bearer token that must be provided in the Authorization header of subsequent requests.

**``request``**

    mutation LoginUser {
      loginUser(email: "frodo@theshire.net", password: "Und3rh!ll") {
        token
      }
    }


**Failed Log In**
Generates the Bearer token that must be provided in the Authorization header of subsequent requests.

**``request``**

    mutation LoginUser {
      loginUser(email: "frodo@theshire.net", password: "thering") {
        token
      }
    }

**``response``**

    {
      "errors": [
        {
          "message": "Invalid password",
    ...

**Update User**
Allows the user to change their name and password. Note that the user must be logged in, and have an HTTP header with their bearer token. E.g.:

    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImlhdCI6MTcyODE0Njg3NCwiZXhwIjoxNzI4MTkwMDc0fQ.lq_exM6bMTu-O5UJAXEn5eu-qSq_8WGEeUzwpz1K0So

**``request``**

      mutation Mutation {
      updateUser(name: "Mr. Underhill", email: "underhill@bagend.com") {
        name
        email
      }
    }


### Events

**Create an Event**
Any user can create an event. They will be set as the organizer of the event, and have the ability to update or cancel it later, and also to approve attendee registrations for private events.

The event can have only one category, which is handled as strings, and can be set by the organizer. Depending on intended usage, in future updates these could be changed to an enumeration or stored as labels in the database, allowing multiple categories per event. 

**``request``**

    mutation CreateEvent {
      createEvent(
        name: "111th Birthday Party", 
        category: "Party", 
        event_datetime: "2025-09-22T04:00:00Z", 
        public: true, 
        max_attendees: 1500
      ) {
        id
        name
        category
        event_datetime
        public
        max_attendees
        organizer {
          id
          name
          email
        }
      }
    }

**Get Event Details**
Any user can retrieve the details of an event after it's created. The response can include an up-to-date attendee count.

**``request``**

    query GetEvent {
      getEvent(id: 1) {
        category
        event_datetime
        id
        max_attendees
        attendee_count
        name
        public
      }
    }

**Get My Events**
Any user can also get a list of the events which they are organizing.

The response is paginated, and the user has control over page size (``max_results``) and offset. There is currently no limit on page size, but for performance reasons one may be introduced in future versions. Integrations can get subsequent pages by setting the ``offset`` in each subsequent call to (``offset`` + ``page_count``) of the previous call. ``page_count`` provides the number of results on the current page. ``total_count`` provides the total number of records available across all pages.

**``request``**

    query {
      getMyEvents(max_results: 10, offset: 0) {
        total_count
        page_count
        offset
        events {
          id
          name
          status
          event_datetime
          max_attendees
          attendee_count
          public
        }
      }
    }

**Update Event**
Users can update any event for which they are the organizer.

**``request``**

    mutation Mutation {
      updateEvent(
        eventId: 1
        name: "111th Birthday Extravaganza!"
        category: "Gathering"
        event_datetime: "2025-09-22T06:00:00Z"
        public: false
        max_attendees: 750
      ) {
        id
        name
        category
        event_datetime
        public
      }
    }

**Cancel Event**
Users can cancel any event for which they are the organizer.

**``request``**

    mutation CancelEvent {
      cancelEvent(eventId: 1) {
        id
        name
        event_datetime
        status
        max_attendees
        attendee_count
        public
      }
    }

### Search, Registration, and Attendee Management

**Get All Events**
All users have the ability to view all events. The results are paginated (see description in the Get My Events section above).

While all events are visible to all users, registering to attend private events requires approval by the organizer. Currently these results are not filtered by date, so all events, both past and future, are provided by this API.

**``request``**

    query GetAllEvents {
      getAllEvents(max_results: 10, offset: 0) {
        total_count
        page_count
        offset
        events {
          id
          name
          status
          event_datetime
          category
          public
          max_attendees
          attendee_count
          organizer {
            id
            name
            email
          }
        }
      }
    }

**Search Events by Category**
Users can search for events by category. Category matches are case-insensitive, but must be a full match. For example: "party" matches "Party", but "party" does not match "birthday party".

**``request``**

    query GetAllEvents {
      getAllEvents(max_results: 10, offset: 0, category: "party") {
        total_count
        page_count
        offset
        events {
          id
          name
        }
      }
    }

**Search Events by Name**
Users can search for events by name. Name searches are case-insensitive and allow for partial matches. Also, name and category searches can be combined.

**``request``**

    query GetAllEvents {
      getAllEvents(max_results: 10, offset: 0, name: "birthday") {
        total_count
        page_count
        offset
        events {
          id
          name
        }
      }
    }


**Register for an Event**
Users can register for public events, and request registration for private events. Both create a Registration record. For public events, approval_status is automatically set to ``true``. For private events, the it is set to ``false`` and updated if the event organizers approves the registration.

Users cannot register for canceled events. Once the maximum number of attendees have registered for the event, no further registrations are allowed. Also, each user is only allowed a single registration for each event.

**``request``**

    mutation RegisterForEvent {
      registerForEvent(eventId: "1") { 
        id
        registration_datetime
        approval_status
      }
    }

**Get User's Registrations**
Users can retrieve the list of all their event registrations.

**``request``**

    query {
      getUserRegistrations {
        id
        registration_datetime
        approval_status
        registeredEvent {
          id
          name
          public
          organizer {
            email
            id
            name
          }
          max_attendees
          attendee_count
        }
      }
    }

**Get Event Registrations**
The organizer of an event can retrieve the list of its registered attendees.

**``request``**

    query GetEventRegistrations {
      getEventRegistrations(eventId: 1) {
        id
        approval_status
        registration_datetime
        attendee {
          email
          id
          name
        }
      }
    }

**Approve Registrations for Private Events**
The organizer of a private event can approve registrations for attendees.

**``request``**

    mutation ApproveRegistration {
      approveRegistration(registrationId: 1) {
        approval_status
        id
        attendee {
          email
          id
          name
        }
      }
    }

**Cancel Registration**
Registrations can be canceled by the event organizer, or by the attendee. Currently this completely delete the registration, allowing the user to register again later if desired.

Cancelation is only allowed 24 hours or more before the start date.

**``request``**

    mutation CancelRegistration {
      cancelRegistration(registrationId: 1)
    }




## Future Enhancements


### Performance and Scalability

The current implementation does not support scaling of the API server, and the Docker Compose deployment tightly couples the server and database. To support future usage growth, these can be set up to run on a container manager like Kubernetes, with configuration for independently auto-scaling based on resource usage.

Currently all event searching is done in the database, using tables set up through sequelize ORM. This works fine for smaller volumes, but may not scale for high volumes. To improve performance, we can optimize the database keys and indices. For event searching by name (with partial match) and category, we could offload that responsibility to Elasticsearch or a similar Lucene/solr search engine.

Attendee counts are currently calculated dynamically every time events are retrieved, by querying all attendees to all events. This does not scale well. Instead, we can maintain the attendee count as part of the event data model, and update it whenever registrations are added or deleted.

### Event and User Content

This version provides minimal content for users and events. Users have names and email addresses, events have names and categories. We could add many more fields, including descriptions and images, to support a more content-reach front-end experience.

### Admin Accounts

The current version does not have admin accounts, so most administration must be done through code updates or directly updating the database. We should add an admin account type, with access to manage all users, events, and registrations. 

For convenience during development and testing, there are some admin GraphQL queries, including getAllUsers and getAllRegistrations. These are not currently secured, and can be called by any user. For security and privacy, these queries should be disabled or limited to admin accounts when running in production.

### Automated Testing

The current implementation does not yet have automated tests. We can implement unit testing of our resolvers and other Javascript code using jest, and explore the best tools for GraphQL API testing, possible the Apollo client, or easygraphql-tester.

### Convert Code Base to Typescript

For speed of implementation, the service is currently written in plain JavaScript. For type safety, the code base can be ported to TypeScript.
