import mongoose = require('mongoose');
const BasketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users',
    },
    products: [
        {
            productName: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true
            },
            cost: {
                type: Number,
                required: true
            }
        }
    ]
});

module.exports = mongoose.model('Basket', BasketSchema);