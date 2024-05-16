const { gql } = require('graphql-tag');



// Définir le schéma GraphQL
const typeDefs = `#graphql
    type Voiture {
        id: String!
        marque: String!
        modele: String!
        description: String!
    }
    type Moto {
        id: String!
        marque: String!
        modele: String!
        description: String!
    }

    type Query {
        voiture(id: String!): Voiture
        voitures: [Voiture]
        moto(id: String!): Moto
        motos: [Moto]
    }

    type Mutation {
        addVoiture(marque: String!, modele: String!, description: String!): Voiture
        addMoto(marque: String!, modele: String!, description: String!): Moto
    }
`;

module.exports = typeDefs;
