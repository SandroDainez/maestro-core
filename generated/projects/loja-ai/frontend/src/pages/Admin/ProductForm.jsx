import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const AUTH = { username: 'admin', password: '123456' };

export default function ProductForm({ editMode = false }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [stock, setStock] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (editMode && id) {
      setLoading(true);
      axios.get(`http://localhost:5000/api/products/${id}`)
        .then(res => {
          setName(res.data.name || '');
          setDescription(res.data.description || '');
          setPrice(res.data.price || '');
          setImage(res.data.image || '');
          setStock(res.data.stock || 0);
        })
        .finally(() => setLoading(false));
    }
  }, [editMode, id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editMode) {
        await axios.put(`http://localhost:5000/api/admin/products/${id}`, {
          name,
          description,
          price: parseFloat(price),
          image,
          stock: parseInt(stock, 10),
        }, { auth: AUTH });
      } else {
        await axios.post('http://localhost:5000/api/admin/products', {
          name,
          description,
          price: parseFloat(price),
          image,
          stock: parseInt(stock, 10),
        }, { auth: AUTH });
      }
      navigate('/admin');
    } catch {
      alert('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  }

  if (loading && editMode) return <p>Carregando dados...</p>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <h2>{editMode ? 'Editar Produto' : 'Novo Produto'}</h2>

      <label>
        Nome:<br />
        <input type="text" value={name} onChange={e => setName(e.target.value)} required />
      </label>
      <br />

      <label>
        Descrição:<br />
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </label>
      <br />

      <label>
        Preço:<br />
        <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
      </label>
      <br />

      <label>
        URL da Imagem:<br />
        <input type="url" value={image} onChange={e => setImage(e.target.value)} />
      </label>
      <br />

      <label>
        Estoque:<br />
        <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
      </label>
      <br />

      <button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
