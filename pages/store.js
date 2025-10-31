import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Store() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('averageRating');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadGameStore();
    }
  }, [currentUser, searchTerm, category, sortBy]);

  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.success) {
        setCurrentUser(data.user);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/');
    }
  }

  async function loadGameStore() {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (category && category !== 'all') params.append('category', category);
      if (sortBy) params.append('sortBy', sortBy);
      
      const response = await fetch(`/api/games/store?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setGames(data.games);
        setCurrentUser(prev => ({ ...prev, coins: data.userCoins }));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load game store:', error);
      setLoading(false);
    }
  }

  async function purchaseWithCoins(gameId) {
    try {
      const response = await fetch(`/api/games/purchase/${gameId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        alert('Game purchased successfully!');
        loadGameStore();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed');
    }
  }

  async function purchaseWithStripe(gameId) {
    try {
      const response = await fetch(`/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.url;
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Stripe error:', error);
      alert('Payment failed');
    }
  }

  if (!currentUser || loading) {
    return (
      <Layout title="Game Store - Loading...">
        <div className="loading">Loading games...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Game Store - Party Game Hub">
      <div className="store-container">
        <div className="header">
          <h1>🎮 Game Store</h1>
          <p>Discover and purchase amazing party games</p>
        </div>

        <div className="user-info">
          <button onClick={() => router.push('/')} className="back-btn">← Back to Home</button>
          <div className="user-coins">💰 {currentUser.coins} coins</div>
        </div>

        <div className="search-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label htmlFor="sortBy">Sort by:</label>
              <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="averageRating">Rating (High to Low)</option>
                <option value="newest">Newest First</option>
                <option value="price_low">Price (Low to High)</option>
                <option value="price_high">Price (High to Low)</option>
                <option value="name">Name (A to Z)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="store-grid">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-card-content">
                <div className="game-info-section">
                  <div className="game-header">
                    <h3 className="game-title">{game.name}</h3>
                    <div className="game-status">
                      {game.owned ? '✅ Owned' : game.free ? '🆓 Free' : ''}
                    </div>
                  </div>
                  <p className="game-description">{game.description}</p>
                  
                  <div className="game-details">
                    <span className="player-count">👥 {game.minPlayers}-{game.maxPlayers} players</span>
                    <span className="game-category">🏷️ {game.category || 'strategy'}</span>
                  </div>
                  
                  <div className="price-info">
                    <span className="coin-price">💰 {game.price} coins</span>
                    <span className="money-price">💳 ${(game.price * 0.01).toFixed(2)}</span>
                  </div>
                  
                  <div className="game-actions">
                    {!game.accessible && game.canAfford ? (
                      <>
                        <button onClick={() => purchaseWithCoins(game.id)} className="purchase-btn">
                          Buy with Coins
                        </button>
                        <button onClick={() => purchaseWithStripe(game.id)} className="stripe-btn">
                          Buy with Card
                        </button>
                      </>
                    ) : game.accessible ? (
                      <button className="owned-btn">{game.owned ? '✅ Owned' : '🆓 Free'}</button>
                    ) : (
                      <>
                        <button className="insufficient-btn" disabled>
                          Need {game.price} coins
                        </button>
                        <button onClick={() => purchaseWithStripe(game.id)} className="stripe-btn">
                          Buy with Card
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .store-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        
        .header {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          padding: 30px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .header h1 {
          color: #333;
          margin-bottom: 10px;
        }
        
        .header p {
          color: #666;
          font-size: 1.1em;
        }
        
        .user-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        
        .user-coins {
          font-size: 1.2em;
          font-weight: bold;
          color: #28a745;
        }
        
        .back-btn {
          background: #6c757d;
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          width: auto;
        }
        
        .search-controls {
          background: white;
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .search-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .search-bar input {
          flex: 1;
        }
        
        .filter-controls {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .filter-group label {
          font-weight: 600;
          color: #333;
          font-size: 0.9em;
        }
        
        .filter-group select {
          padding: 8px 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 0.9em;
        }
        
        .store-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .game-card {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          overflow: hidden;
          transition: transform 0.3s;
        }
        
        .game-card:hover {
          transform: translateY(-5px);
        }
        
        .game-card-content {
          padding: 20px;
        }
        
        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        
        .game-title {
          font-size: 1.3em;
          color: #333;
          margin: 0;
        }
        
        .game-status {
          font-size: 0.9em;
          padding: 5px 10px;
          border-radius: 15px;
          background: #e9ecef;
        }
        
        .game-description {
          color: #666;
          margin: 10px 0;
        }
        
        .game-details {
          display: flex;
          gap: 10px;
          margin: 10px 0;
        }
        
        .player-count, .game-category {
          font-size: 0.8em;
          color: #666;
          background: #f8f9fa;
          padding: 5px 10px;
          border-radius: 10px;
        }
        
        .price-info {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 10px;
        }
        
        .coin-price {
          color: #28a745;
          font-weight: bold;
        }
        
        .money-price {
          color: #007bff;
          font-weight: bold;
        }
        
        .game-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .purchase-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          flex: 1;
        }
        
        .stripe-btn {
          background: linear-gradient(135deg, #635bff 0%, #7c3aed 100%);
          flex: 1;
        }
        
        .owned-btn {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .insufficient-btn {
          background: #dc3545;
          cursor: not-allowed;
          flex: 1;
        }
        
        .loading {
          text-align: center;
          padding: 50px;
          color: white;
          font-size: 1.2em;
        }
      `}</style>
    </Layout>
  );
}

