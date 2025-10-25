import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Creator() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.success) {
        setCurrentUser(data.user);
        setLoading(false);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/');
    }
  }

  if (!currentUser || loading) {
    return (
      <Layout title="Creator Dashboard - Loading...">
        <div className="loading">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Creator Dashboard - Party Game Hub">
      <div className="creator-container">
        <div className="header">
          <h1>🎮 Creator Dashboard</h1>
          <p>Upload and manage your custom games</p>
        </div>

        <div className="user-info">
          <button onClick={() => router.push('/')} className="back-btn">← Back to Home</button>
        </div>

        <div className="content">
          <div className="info-box">
            <h2>Coming Soon!</h2>
            <p>The Creator Dashboard is under development. Soon you'll be able to:</p>
            <ul>
              <li>📤 Upload your own custom party games</li>
              <li>📊 View game statistics and analytics</li>
              <li>💰 Set pricing and manage sales</li>
              <li>✏️ Edit and update your games</li>
              <li>🎨 Customize game thumbnails and media</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .creator-container {
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
        
        .user-info {
          background: white;
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        
        .back-btn {
          background: #6c757d;
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          width: auto;
        }
        
        .content {
          background: white;
          border-radius: 20px;
          padding: 40px;
        }
        
        .info-box {
          text-align: center;
        }
        
        .info-box h2 {
          color: #333;
          margin-bottom: 20px;
        }
        
        .info-box p {
          color: #666;
          font-size: 1.1em;
          margin-bottom: 20px;
        }
        
        .info-box ul {
          list-style: none;
          text-align: left;
          max-width: 600px;
          margin: 0 auto;
          padding: 0;
        }
        
        .info-box li {
          background: #f8f9fa;
          padding: 15px;
          margin: 10px 0;
          border-radius: 10px;
          border-left: 4px solid #667eea;
          font-size: 1.1em;
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

