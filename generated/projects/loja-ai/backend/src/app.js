const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
  res.send('Loja-AI Backend API is running');
});

module.exports = app;
