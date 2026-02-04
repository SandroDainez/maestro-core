import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AUTH = { username: 'admin', password: '123456' };

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    setLoading(true);
    axios.get('http://localhost:5000/api/admin/products', { auth: AUTH })
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const deleteProduct = (id) => {
    if (!window.confirm('Deseja deletar este produto?')) return;
    axios.delete(`http://localhost:5000/api/admin/products/${id}`, { auth: AUTH })
      .then(() => fetchProducts());
  };

  if (loading) return <p>Carregando produtos...</p>;

  return (
    <div>
      {products.length === 0 && <p>Nenhum produto cadastrado.</p>}
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {products.map(product => (
          <li key={product._id} style={{ borderBottom: '1px solid #ccc', marginBottom: '1rem', paddingBottom: '1rem' }}>
            <strong>{product.name}</strong> - R$ {product.price.toFixed(2)} <br />
            <Link to={`/admin/edit/${product._id}`} style={{ marginRight: '1rem' }}>Editar</Link>
            <button onClick={() => deleteProduct(product._id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
              Deletar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
