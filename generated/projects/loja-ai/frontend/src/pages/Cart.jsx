import React, { useEffect, useState } from 'react';

export default function Cart() {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Salva o carrinho no localStorage automaticamente ao mudar
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  function updateQty(id, qty) {
    const updated = cart.map(item =>
      item._id === id ? { ...item, qty } : item
    );
    setCart(updated);
  }

  function removeItem(id) {
    const filtered = cart.filter(item => item._id !== id);
    setCart(filtered);
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) return <p>Seu carrinho está vazio.</p>;

  return (
    <div>
      <h2>Seu Carrinho</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {cart.map(item => (
          <li
            key={item._id}
            style={{
              borderBottom: '1px solid #ccc',
              paddingBottom: '1rem',
              marginBottom: '1rem'
            }}
          >
            <h3>{item.name}</h3>
            <p>Preço unitário: R$ {item.price.toFixed(2)}</p>
            <label>
              Quantidade:{' '}
              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={e =>
                  updateQty(item._id, Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{ width: '60px' }}
              />
            </label>
            <br />
            <button
              onClick={() => removeItem(item._id)}
              style={{ marginTop: '0.5rem' }}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
      <h3>Total: R$ {total.toFixed(2)}</h3>
      <button disabled style={{ padding: '0.75rem 1.5rem', opacity: 0.6, cursor: 'not-allowed' }}>
        Finalizar Compra (em breve)
      </button>
    </div>
  );
}
