import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/products')
      .then(response => {
        setProducts(response.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar produtos.');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Carregando produtos...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
      gap: '1rem',
      padding: '1rem'
    }}>
      {products.map(product => (
        <div 
          key={product._id} 
          style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1rem',
            backgroundColor: '#fff'
          }}
        >
          {product.image && (
            <img 
              src={product.image} 
              alt={product.name} 
              style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '6px' }} 
            />
          )}
          <h3>{product.name}</h3>
          <p>R$ {product.price.toFixed(2)}</p>
          <Link to={`/products/${product._id}`} style={{ color: '#007bff' }}>
            Ver detalhes
          </Link>
        </div>
      ))}
    </div>
  );
}
