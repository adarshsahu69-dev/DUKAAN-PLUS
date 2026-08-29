import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import typeDefs from "./typeDefs.js";
import resolvers from "./resolvers.js";

export async function createGraphqlServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });
  await server.start();
  return expressMiddleware(server);
}
