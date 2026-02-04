import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import ProductList from './ProductList';
import ProductForm from './ProductForm';

export default function Admin() {
  return (
    <div>
      <h1>Área Administrativa</h1>
      <nav style={{ marginBottom: '1rem' }}>
        <Link to="" style={{ marginRight: '1rem' }}>Lista de Produtos</Link>
        <Link to="new">Novo Produto</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="new" element={<ProductForm />} />
        <Route path="edit/:id" element={<ProductForm editMode={true} />} />
      </Routes>
    </div>
  );
}
