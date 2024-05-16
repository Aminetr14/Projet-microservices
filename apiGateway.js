const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');

// Charger le fichier proto pour les voitures et les motos
const voitureProtoPath = 'voiture.proto';
const motoProtoPath = 'moto.proto';
const resolvers = require('./resolvers');
const typeDefs = require('./schema');

// Créer une nouvelle application Express
const app = express();
const voitureProtoDefinition = protoLoader.loadSync(voitureProtoPath, {
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
app.use(bodyParser.json());
const voitureProto = grpc.loadPackageDefinition(voitureProtoDefinition).voiture;
const motoProto = grpc.loadPackageDefinition(motoProtoDefinition).moto;

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092'] 
});

const consumer = kafka.consumer({ groupId: 'api-gateway-consumer' });

consumer.subscribe({ topic: 'voitures-topic' });
consumer.subscribe({ topic: 'motos-topic' });

(async () => {
    await consumer.connect();
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            console.log(`Received message: ${message.value.toString()}, from topic: ${topic}`);
        },
    });
})();

// Créer une instance ApolloServer avec le schéma et les résolveurs importés
const server = new ApolloServer({ typeDefs, resolvers });

// Appliquer le middleware ApolloServer à l'application Express
server.start().then(() => {
    app.use(
        cors(),
        bodyParser.json(),
        expressMiddleware(server),
    );
});

app.get('/voitures', (req, res) => {
    const client = new voitureProto.VoitureService('localhost:50051',
        grpc.credentials.createInsecure());
    client.searchVoitures({}, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.voitures);
        }
    });
});

app.get('/voitures/:id', (req, res) => {
    const client = new voitureProto.VoitureService('localhost:50051',
        grpc.credentials.createInsecure());
    const id = req.params.id;
    client.getVoiture({ voiture_id: id }, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.voiture);
        }
    });
});

app.post('/voitures/add', (req, res) => {
    const client = new voitureProto.VoitureService('localhost:50051',
        grpc.credentials.createInsecure());
    const data = req.body;
    const titre=data.title;
    const desc= data.description
    client.addVoiture({ title: titre,description:desc }, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.voiture);
        }
    });
});

app.get('/motos', (req, res) => {
    const client = new motoProto.MotoService('localhost:50052',
        grpc.credentials.createInsecure());
    client.searchMotos({}, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.motos);
        }
    });
});

app.get('/motos/:id', (req, res) => {
    const client = new motoProto.MotoService('localhost:50052',
        grpc.credentials.createInsecure());
    const id = req.params.id;
    client.getMoto({ moto_id: id }, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.moto);
        }
    });
});

app.post('/motos/add', (req, res) => {
    const client = new motoProto.MotoService('localhost:50052',
        grpc.credentials.createInsecure());
    const data = req.body;
    const titre=data.title;
    const desc= data.description
    client.addMoto({ title: titre,description:desc }, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.moto);
        }
    });
});

// Démarrer l'application Express
const port = 3000;
app.listen(port, () => {
    console.log(`API Gateway is running on port ${port}`);
});
