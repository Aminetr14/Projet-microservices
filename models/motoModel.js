const mongoose = require('mongoose');

const motoSchema = new mongoose.Schema({
    title: String,
    description: String,
});

const Moto = mongoose.model('Moto', motoSchema);

module.exports = Moto;
