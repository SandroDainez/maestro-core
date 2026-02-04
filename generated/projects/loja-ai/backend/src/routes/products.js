const express = require('express');
const Product = require('../models/Product');

const publicRoutes = express.Router();
const adminRoutes = express.Router();

// Rotas públicas (listagem e detalhe)
publicRoutes.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({createdAt: -1});
    res.json(products);
  } catch {
    res.status(500).json({error: 'Erro ao listar produtos'});
  }
});

publicRoutes.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if(!product) return res.status(404).json({error: 'Produto não encontrado'});
    res.json(product);
  } catch {
    res.status(500).json({error: 'Erro ao buscar produto'});
  }
});

// Rotas administrativas (CRUD)
adminRoutes.post('/', async (req, res) => {
  try {
    const { name, description, price, image, stock } = req.body;
    if(!name || price == null) return res.status(400).json({error: 'Nome e preço são obrigatórios'});
    const product = new Product({ name, description, price, image, stock });
    await product.save();
    res.status(201).json(product);
  } catch {
    res.status(400).json({error: 'Erro ao criar produto'});
  }
});

adminRoutes.put('/:id', async (req, res) => {
  try {
    const { name, description, price, image, stock } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id,
      { name, description, price, image, stock }, { new: true });
    if(!product) return res.status(404).json({error: 'Produto não encontrado'});
    res.json(product);
  } catch {
    res.status(400).json({error: 'Erro ao atualizar produto'});
  }
});

adminRoutes.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if(!product) return res.status(404).json({error: 'Produto não encontrado'});
    res.json({message: 'Produto deletado com sucesso'});
  } catch {
    res.status(500).json({error: 'Erro ao deletar produto'});
  }
});

module.exports = { publicRoutes, adminRoutes };
