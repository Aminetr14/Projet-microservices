const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
// Charger le fichier moto.proto
const motoProtoPath = 'moto.proto';
const mongoose = require('mongoose');
const Moto = require('./models/motoModel');
const { Kafka } = require('kafkajs');

const motoProtoDefinition = protoLoader.loadSync(motoProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092']
});

const producer = kafka.producer();

const motoProto = grpc.loadPackageDefinition(motoProtoDefinition).moto;
const url = 'mongodb://localhost:27017/motosDB';

mongoose.connect(url)
    .then(() => {
        console.log('Connecté à la base de données !');
    }).catch((err) => {
        console.log(err);
    })

const motoService = {
    getMoto: async (call, callback) => {
        try {
            const motoId = call.request.moto_id;
            const moto = await Moto.findOne({ _id: motoId }).exec();
            await producer.connect();
            await producer.send({
                topic: 'motos-topic',
                messages: [{ value: 'Recherche de moto avec l\'identifiant : ' + motoId.toString() }],
            });

            if (!moto) {
                callback({ code: grpc.status.NOT_FOUND, message: 'Moto introuvable' });
                return;
            }
            callback(null, { moto: moto });

        } catch (error) {
            await producer.connect();
            await producer.send({
                topic: 'motos-topic',
                messages: [{ value: `Une erreur s'est produite lors de la recherche de la moto : ${error}` }],
            });
            callback({ code: grpc.status.INTERNAL, message: 'Une erreur s\'est produite lors de la recherche de la moto' });
        }
    },
    searchMotos: async (call, callback) => {
        try {
            const motos = await Moto.find({}).exec();

            await producer.connect();
            await producer.send({
                topic: 'motos-topic',
                messages: [{ value: 'Recherche de motos' }],
            });

            callback(null, { motos: motos });
        } catch (error) {
            await producer.connect();
            await producer.send({
                topic: 'motos-topic',
                messages: [{ value: `Une erreur s'est produite lors de la recherche des motos : ${error}` }],
            });

            callback({ code: grpc.status.INTERNAL, message: 'Une erreur s\'est produite lors de la recherche des motos' });
        }
    },
    
    addMoto: async (call, callback) => {
        const { title, description } = call.request;
        console.log(call.request);
        const newMoto = new Moto({ title, description });

        try {
            await producer.connect();

            await producer.send({
                topic: 'motos-topic',
                messages: [{ value: JSON.stringify(newMoto) }],
            });

            await producer.disconnect();

            const savedMoto = await newMoto.save();

            callback(null, { moto: savedMoto });
        } catch (error) {
            callback({ code: grpc.status.INTERNAL, message: 'Une erreur s\'est produite lors de l\'ajout de la moto' });
        }
    }
};

// Créer et démarrer le serveur gRPC
const server = new grpc.Server();
server.addService(motoProto.MotoService.service, motoService);
const port = 50052;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Échec de la liaison du serveur:', err);
            return;
        }
        console.log(`Le serveur s'exécute sur le port ${port}`);
        server.start();
    });
console.log(`Microservice de motos en cours d'exécution sur le port ${port}`);
