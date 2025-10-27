import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Game() {
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    if (id) {
      loadGameDetails();
    }
  }, [id]);

  async function loadGameDetails() {
    try {
      setLoading(true);
      const response = await fetch(`/api/games/game/${id}`);
      const data = await response.json();

      if (data.success) {
        setGame(data.game);
      } else {
        setError(data.message || 'Failed to load game details');
      }
    } catch (error) {
      console.error('Failed to load game details:', error);
      setError('Failed to load game details');
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '★';
    }
    if (hasHalfStar) {
      stars += '☆';
    }
    for (let i = 0; i < emptyStars; i++) {
      stars += '★';
    }
    return stars;
  }

  function openImageGallery(index) {
    setCurrentImageIndex(index);
    setShowGallery(true);
  }

  function closeImageGallery() {
    setShowGallery(false);
  }

  function previousImage() {
    if (!game?.images) return;
    setCurrentImageIndex((prev) => 
      (prev - 1 + game.images.length) % game.images.length
    );
  }

  function nextImage() {
    if (!game?.images) return;
    setCurrentImageIndex((prev) => (prev + 1) % game.images.length);
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

  if (loading) {
    return (
      <Layout title="Game Details - Loading...">
        <div className="loading">Loading game details...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Game Details - Error">
        <div className="error">{error}</div>
      </Layout>
    );
  }

  if (!game) {
    return (
      <Layout title="Game Details - Not Found">
        <div className="error">Game not found</div>
      </Layout>
    );
  }

  const usdPrice = (game.price / 100).toFixed(2);
  const ratingStars = renderStars(game.averageRating || 0);
  const ratingText = game.totalRatings > 0 ? 
    `${game.averageRating.toFixed(1)} (${game.totalRatings} review${game.totalRatings !== 1 ? 's' : ''})` : 
    'No ratings yet';
  const reviewsWithText = game.ratings.filter(r => r.review && r.review.trim()).length;

  return (
    <Layout title={`${game.name} - Game Details`}>
      <div className="game-container">
        <div className="header">
          <h1>🎮 Game Details</h1>
          <p>Explore game information and reviews</p>
        </div>

        <button onClick={() => router.push('/store')} className="back-btn">
          ← Back to Store
        </button>

        <div className="game-details-card">
          <div className="game-header">
            <img 
              src={game.logo || '/game-logos/default-logo.png'} 
              alt={game.name} 
              className="game-logo"
            />
            <div className="game-info">
              <h2>{game.name}</h2>
              <p className="game-description">{game.description}</p>
              
              <div className="game-meta">
                <span className="meta-item">👥 {game.minPlayers}-{game.maxPlayers} players</span>
                <span className="meta-item">🏷️ {game.category || 'strategy'}</span>
                <span className="meta-item">💳 ${usdPrice}</span>
              </div>
              
              <div className="rating-display">
                <div className="stars">{ratingStars}</div>
                <span className="rating-text">{ratingText}</span>
              </div>
              
              <div className="game-actions">
                <button onClick={() => purchaseWithStripe(game.id)} className="purchase-btn">
                  Buy for ${usdPrice}
                </button>
              </div>
            </div>
          </div>
          
          {game.images && game.images.length > 0 && (
            <div className="image-gallery">
              <h3 className="gallery-title">Game Images</h3>
              <div className="gallery-grid">
                {game.images.map((image, index) => (
                  <div key={index} className="gallery-item" onClick={() => openImageGallery(index)}>
                    <img src={image.url} alt={image.caption || 'Game Image'} />
                    {image.caption && (
                      <div className="gallery-caption">{image.caption}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="reviews-section">
          <h3 className="reviews-title">
            📝 Reviews ({reviewsWithText})
          </h3>
          
          {game.ratings && game.ratings.length > 0 ? (
            game.ratings.map((rating, index) => (
              <div key={index} className="review-item">
                <div className="review-header">
                  <span className="review-author">{rating.userId.username || 'Anonymous'}</span>
                  <span className="review-date">{new Date(rating.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="review-rating">{renderStars(rating.rating)}</div>
                {rating.reviewTitle && (
                  <div className="review-title">{rating.reviewTitle}</div>
                )}
                {rating.review && (
                  <div className="review-text">{rating.review}</div>
                )}
              </div>
            ))
          ) : (
            <div className="no-reviews">No reviews yet. Be the first to review this game!</div>
          )}
        </div>

        {/* Image Gallery Modal */}
        {showGallery && game.images && game.images.length > 0 && (
          <div className="gallery-modal" onClick={closeImageGallery}>
            <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
              <span className="gallery-close" onClick={closeImageGallery}>&times;</span>
              <img 
                src={game.images[currentImageIndex].url} 
                alt={game.images[currentImageIndex].caption || 'Game Image'} 
                className="gallery-main-image"
              />
              <div className="gallery-caption-modal">
                {game.images[currentImageIndex].caption || `Image ${currentImageIndex + 1} of ${game.images.length}`}
              </div>
              <button className="gallery-nav prev" onClick={previousImage}>‹</button>
              <button className="gallery-nav next" onClick={nextImage}>›</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .game-container {
          max-width: 1000px;
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
        
        .back-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 20px;
        }
        
        .back-btn:hover {
          background: #5a6268;
        }

        .game-details-card {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          overflow: hidden;
          margin-bottom: 20px;
        }

        .game-header {
          padding: 30px;
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 30px;
          align-items: center;
        }

        @media (max-width: 768px) {
          .game-header {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 20px;
          }
        }

        .game-logo {
          width: 200px;
          height: 200px;
          object-fit: cover;
          border-radius: 10px;
        }

        .game-info h2 {
          font-size: 2em;
          color: #333;
          margin-bottom: 10px;
        }

        .game-description {
          color: #666;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .game-meta {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .meta-item {
          background: #f8f9fa;
          padding: 8px 15px;
          border-radius: 20px;
          font-size: 0.9em;
          color: #666;
        }

        .rating-display {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .stars {
          display: flex;
          gap: 2px;
        }

        .star {
          color: #ffc107;
          font-size: 1.2em;
        }

        .star.empty {
          color: #e9ecef;
        }

        .rating-text {
          font-size: 1em;
          color: #666;
        }

        .game-actions {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .purchase-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .purchase-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
        }

        .image-gallery {
          padding: 30px;
          border-top: 1px solid #e9ecef;
        }

        .gallery-title {
          font-size: 1.3em;
          color: #333;
          margin-bottom: 20px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .gallery-item {
          position: relative;
          cursor: pointer;
          border-radius: 10px;
          overflow: hidden;
          transition: transform 0.3s;
        }

        .gallery-item:hover {
          transform: scale(1.05);
        }

        .gallery-item img {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .gallery-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: white;
          padding: 10px;
          font-size: 0.8em;
        }

        .reviews-section {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          padding: 30px;
        }

        .reviews-title {
          font-size: 1.5em;
          color: #333;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .review-item {
          border-bottom: 1px solid #e9ecef;
          padding: 20px 0;
        }

        .review-item:last-child {
          border-bottom: none;
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .review-author {
          font-weight: 600;
          color: #333;
        }

        .review-date {
          font-size: 0.8em;
          color: #666;
        }

        .review-rating {
          display: flex;
          gap: 2px;
          margin: 5px 0;
        }

        .review-rating .star {
          font-size: 1em;
        }

        .review-title {
          font-size: 1.1em;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .review-text {
          color: #666;
          line-height: 1.5;
        }

        .no-reviews {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 40px;
        }

        .loading {
          text-align: center;
          padding: 50px;
          color: white;
          font-size: 1.2em;
        }

        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: center;
        }

        /* Image Gallery Modal */
        .gallery-modal {
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.9);
        }

        .gallery-content {
          position: relative;
          margin: auto;
          padding: 20px;
          width: 90%;
          max-width: 800px;
          top: 50%;
          transform: translateY(-50%);
        }

        .gallery-close {
          position: absolute;
          top: 15px;
          right: 35px;
          color: #f1f1f1;
          font-size: 40px;
          font-weight: bold;
          cursor: pointer;
        }

        .gallery-close:hover {
          color: #bbb;
        }

        .gallery-main-image {
          width: 100%;
          max-height: 500px;
          object-fit: contain;
          border-radius: 10px;
        }

        .gallery-caption-modal {
          text-align: center;
          color: white;
          margin-top: 10px;
          font-size: 1.1em;
        }

        .gallery-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 30px;
          padding: 10px 15px;
          cursor: pointer;
          border-radius: 5px;
        }

        .gallery-nav:hover {
          background: rgba(255,255,255,0.3);
        }

        .gallery-nav.prev {
          left: 20px;
        }

        .gallery-nav.next {
          right: 20px;
        }
      `}</style>
    </Layout>
  );
}
