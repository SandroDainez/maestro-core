import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/products/${id}`)
      .then(res => setProduct(res.data))
      .catch(() => setProduct(null));
  }, [id]);

  function addToCart() {
    if (!product) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex(item => item._id === product._id);

    if (existingIndex >= 0) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({ ...product, qty });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    navigate('/cart');
  }

  if (!product) return <p>Produto não encontrado.</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
        ← Voltar
      </button>
      {product.image && (
        <img
          src={product.image}
          alt={product.name}
          style={{ maxWidth: 300 }}
        />
      )}
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p><strong>R$ {product.price.toFixed(2)}</strong></p>
      <label>
        Quantidade:{' '}
        <input
          type="number"
          min="1"
          value={qty}
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          style={{ width: 50 }}
        />
      </label>
      <br />
      <button onClick={addToCart} style={{ marginTop: 10 }}>
        Adicionar ao carrinho
      </button>
    </div>
  );
}
