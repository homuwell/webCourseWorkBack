require('dotenv').config();
import cors from 'cors';
const express = require('express');
import mongoose = require('mongoose');
require('./models/Users');
require('./models/Products');
require('./models/Categories');
require('./models/Basket');
require('./models/Orders');
const schema = require('./schema/schema');
const {graphqlHTTP} = require('express-graphql');
const { graphqlUploadExpress } = require('graphql-upload');
const app = express();
app.use(cors());
app.options('*',cors());
app.use(express.json());
app.use('/graphql',  graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }), graphqlHTTP({
    schema,
    graphiql: true
})
);
app.use('/uploads', express.static('uploads'));
mongoose.connect(process.env.DATABASE, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
}).then(response => {
    console.log('database connection established');
}).catch(err => {
    console.log(`Can not connect to database, connection error + ${err}`);
});
app.listen(process.env.PORT, ()=> {console.log(`Server started at ${process.env.PORT}`) });