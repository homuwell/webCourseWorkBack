import mongoose = require('mongoose');
const OrdersSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Users',
    },
    date: {
        type: Date,
        required: true,
        default: Date.now(),
    },
    cost: {
        type: Number,
        required: true,
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

module.exports = mongoose.model('Orders', OrdersSchema);