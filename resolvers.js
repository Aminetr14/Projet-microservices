const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load proto files for cars and motorcycles
const carProtoPath = 'voiture.proto';
const motoProtoPath = 'moto.proto';

const carProtoDefinition = protoLoader.loadSync(carProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const motoProtoDefinition = protoLoader.loadSync(motoProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const carProto = grpc.loadPackageDefinition(carProtoDefinition).voiture;
const motoProto = grpc.loadPackageDefinition(motoProtoDefinition).moto;

// Define resolvers for GraphQL queries
const resolvers = {
    Query: {
        voiture: (_, { id }) => {
            const client = new carProto.VoitureService('localhost:50051', grpc.credentials.createInsecure());
            return new Promise((resolve, reject) => {
                client.getVoiture({ voiture_id: id }, (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response.voiture);
                    }
                });
            });
        },
        voitures: () => {
            const client = new carProto.VoitureService('localhost:50051', grpc.credentials.createInsecure());
            return new Promise((resolve, reject) => {
                client.searchVoitures({}, (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response.voitures);
                    }
                });
            });
        },
        moto: (_, { id }) => {
            const client = new motoProto.MotoService('localhost:50052', grpc.credentials.createInsecure());
            return new Promise((resolve, reject) => {
                client.getMoto({ moto_id: id }, (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response.moto);
                    }
                });
            });
        },
        motos: () => {
            const client = new motoProto.MotoService('localhost:50052', grpc.credentials.createInsecure());
            return new Promise((resolve, reject) => {
                client.searchMotos({}, (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response.motos);
                    }
                });
            });
        },
    },
    Mutation: {
        addVoiture: (_, { marque, modele, description }) => {
            const client = new carProto.VoitureService('localhost:50051', grpc.credentials.createInsecure());
            return new Promise((resolve, reject) => {
                client.addVoiture({ marque, modele, description }, (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response.voiture);
                    }
                });
            });
        },
        addMoto: (_, { marque, modele, description }) => {
            const client = new motoProto.MotoService('localhost:50052', grpc.credentials.createInsecure());
            return new Promise((resolve, reject) => {
                client.addMoto({ marque, modele, description }, (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response.moto);
                    }
                });
            });
        },
    },
};

module.exports = resolvers;
