const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const Voiture = require('./models/voitureModel');
const { Kafka } = require('kafkajs');

const voitureProtoPath = 'voiture.proto';
const voitureProtoDefinition = protoLoader.loadSync(voitureProtoPath, {
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
const voitureProto = grpc.loadPackageDefinition(voitureProtoDefinition).voiture;

const url = 'mongodb://localhost:27017/voituresDB';

mongoose.connect(url)
    .then(() => {
        console.log('connected to database!');
    }).catch((err) => {
        console.log(err);
    });

const voitureService = {
    getVoiture: async (call, callback) => {
        await producer.connect();
        try {
            const voitureId = call.request.voiture_id;
            const voiture = await Voiture.findOne({ _id: voitureId }).exec();
            await producer.send({
                topic: 'voitures-topic',
                messages: [{ value: 'Searched for Voiture id : '+voitureId.toString() }],
            });
            if (!voiture) {
                callback({ code: grpc.status.NOT_FOUND, message: 'Voiture not found' });
                return;
            }
            callback(null, { voiture });
        } catch (error) {
            await producer.send({
                topic: 'voitures-topic',
                messages: [{ value: `Error occurred while fetching voiture: ${error}` }],
            });
            callback({ code: grpc.status.INTERNAL, message: 'Error occurred while fetching voiture' });
        }
    },
    searchVoitures: async(call, callback) => {
        try{
            const voitures = await Voiture.find({}).exec();
            await producer.connect();
            await producer.send({
                topic: 'voitures-topic',
                messages: [{ value: 'Searched for Voitures' }],
            });
            callback(null, { voitures });
        }catch(error){
            await producer.connect();
            await producer.send({
                topic: 'voitures-topic',
                messages: [{ value: `Error occurred while fetching Voitures: ${error}` }],
            });
            callback({ code: grpc.status.INTERNAL, message: 'Error occurred while fetching Voitures' });
        }
    },
    addVoiture: async (call, callback) => {
        const { marque, modèle, description } = call.request;
        const newVoiture = new Voiture({ marque, modèle, description });
        try {
            await producer.connect();
            await producer.send({
                topic: 'voitures-topic',
                messages: [{ value: JSON.stringify(newVoiture) }],
            });
            await producer.disconnect();
            const savedVoiture = await newVoiture.save();
            callback(null, { voiture: savedVoiture });
        } catch (error) {
            callback({ code: grpc.status.INTERNAL, message: 'Error occurred while adding voiture' });
        }
    }
};

const server = new grpc.Server();
server.addService(voitureProto.VoitureService.service, voitureService);
const port = 50051;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Failed to bind server:', err);
            return;
        }
        console.log(`Server is running on port ${port}`);
        server.start();
    });
console.log(`Voiture microservice is running on port ${port}`);
