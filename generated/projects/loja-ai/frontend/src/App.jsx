import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Admin from './pages/Admin';

function App() {
  return (
    <>
      <nav style={{background: '#282c34', padding: '1rem'}}>
        <Link to="/" style={{color: '#61dafb', marginRight: 20}}>Loja</Link>
        <Link to="/cart" style={{color: '#61dafb', marginRight: 20}}>Carrinho</Link>
        <Link to="/admin" style={{color: '#61dafb'}}>Admin</Link>
      </nav>
      <div style={{padding: '1rem'}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin/*" element={<Admin />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
