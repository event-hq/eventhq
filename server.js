const { ApolloServer } = require('apollo-server');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const db = require('./utils/db'); 
require('dotenv').config(); 

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req, db }), 
});

server.listen({ port: 3000 }).then(({ url }) => {
    console.log(`Server ready at ${url}`);
  });