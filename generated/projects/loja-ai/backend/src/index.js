require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const productRoutes = require('./routes/products');

const app = express();

app.use(cors());
app.use(express.json());

// Autenticação básica para rotas administrativas
app.use('/api/admin', basicAuth({
  users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
  challenge: true,
  unauthorizedResponse: () => 'Acesso negado - precisa autenticar'
}));

// Rotas públicas
app.use('/api/products', productRoutes.publicRoutes);

// Rotas administrativas protegidas
app.use('/api/admin/products', productRoutes.adminRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB conectado');
    app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
  })
  .catch((e) => {
    console.error('Erro ao conectar MongoDB:', e);
  });
