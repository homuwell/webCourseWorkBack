import mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsersSchema = new Schema ({
    login: {
        type: String,
        require: true,
        unique: true
    },
    type: {
        type: Boolean,
        require: true
    },
    name: {
        type: String,
        require: true
    },
    surname: {
        type: String,
        require: true
    },
    phoneNumber: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true
    }
});
module.exports = mongoose.model('Users', UsersSchema);