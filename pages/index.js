import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showJoinSection, setShowJoinSection] = useState(false);
  const [activeLobby, setActiveLobby] = useState(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  // Join lobby
  const [lobbyCode, setLobbyCode] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  useEffect(() => {
    if (currentUser) {
      checkActiveLobby();
    }
  }, [currentUser]);

  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }
  
  async function checkActiveLobby() {
    try {
      const response = await fetch('/api/auth/activeLobby');
      const data = await response.json();
      
      if (data.success && data.activeLobby) {
        setActiveLobby(data.activeLobby);
      }
    } catch (error) {
      console.error('Failed to check active lobby:', error);
    }
  }
  
  function handleReconnect() {
    if (activeLobby && activeLobby.lobbyCode) {
      router.push(`/play?code=${activeLobby.lobbyCode}`);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentUser(data.user);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    
    if (!registerUsername || !registerEmail || !registerPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (registerPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: registerUsername, 
          email: registerEmail, 
          password: registerPassword 
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentUser(data.user);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  function handleQuickHost() {
    window.open('/host', '_blank');
  }

  function handleJoinLobby() {
    if (!lobbyCode.trim()) {
      alert('Enter lobby code!');
      return;
    }
    router.push(`/play?code=${lobbyCode.toUpperCase()}`);
  }

  if (!currentUser) {
    return (
      <Layout title="Party Game Hub - Login">
        <div className="container">
          <h1>Couchplay</h1>

          {showLogin ? (
            <div>
              <h2>Sign In</h2>
              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <button type="submit">Login</button>
              </form>
              <p>
                Don't have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setShowLogin(false); }}>
                  Register here
                </a>
              </p>
              
              <div style={{ margin: '30px 0', padding: '20px', background: '#f8f9fa', borderRadius: '10px', borderLeft: '4px solid #28a745' }}>
                <h3>Quick Start</h3>
                <p>Want to start playing immediately?</p>
                <button onClick={handleQuickHost} style={{ background: '#28a745', width: '100%', marginTop: '10px' }}>
                  Host Lobby
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2>Sign Up</h2>
              <form onSubmit={handleRegister}>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Username"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <input
                    type="email"
                    placeholder="Email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                </div>
                <button type="submit">Register</button>
              </form>
              <p>
                Already have an account?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setShowLogin(true); }}>
                  Sign In
                </a>
              </p>
              
              <div style={{ margin: '30px 0', padding: '20px', background: '#f8f9fa', borderRadius: '10px', borderLeft: '4px solid #28a745' }}>
                <h3>🎮 Quick Start</h3>
                <p>Want to start playing immediately?</p>
                <button onClick={handleQuickHost} style={{ background: '#28a745', width: '100%', marginTop: '10px' }}>
                  Host Lobby
                </button>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          a {
            color: #667eea;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          h2 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
          }
          p {
            text-align: center;
            margin-top: 20px;
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout title="Party Game Hub - Home">
      <div className="container">
        <h1>Couchplay</h1>
        
        <div id="userInfo">
          <h3>Welcome, {currentUser.username}!</h3>
          <p>Coins: {currentUser.coins}</p>
          <button onClick={handleLogout} style={{ background: '#dc3545', margin: '10px 0' }}>
            Logout
          </button>
        </div>
        
        {activeLobby && (
          <div style={{ 
            margin: '20px 0', 
            padding: '20px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            borderRadius: '10px',
            color: 'white',
            borderLeft: '4px solid #ffd700'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>🔌 Reconnect to Game</h4>
            <p style={{ margin: '0 0 15px 0', fontSize: '0.9em' }}>
              You have an active lobby: <strong>{activeLobby.lobbyCode}</strong>
              {activeLobby.hasActiveGame && ' (Game in progress)'}
            </p>
            <button onClick={handleReconnect} style={{ 
              background: '#fff', 
              color: '#667eea', 
              width: '100%',
              fontWeight: 'bold'
            }}>
              ⚡ Reconnect Now
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px', margin: '20px 0', flexWrap: 'wrap' }}>
          <button onClick={() => window.open('/host', '_blank')} style={{ flex: 1 }}>
            Host Lobby
          </button>
          <button onClick={() => setShowJoinSection(!showJoinSection)} style={{ flex: 1, background: '#28a745' }}>
            Join Lobby
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => router.push('/store')} style={{ flex: 1, background: '#6f42c1' }}>
            Game Store
          </button>
          <button onClick={() => router.push('/creator')} style={{ flex: 1, background: '#fd7e14' }}>
            Creator Dashboard
          </button>
        </div>
        
        {showJoinSection && (
          <div>
            <div className="input-group">
              <input
                placeholder="Enter Lobby Code (4 letters)"
                maxLength="4"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
              />
            </div>
            <button onClick={handleJoinLobby}>🚀 Join Lobby</button>
          </div>
        )}
      </div>

      <style jsx>{`
        h3 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          margin-bottom: 10px;
        }
      `}</style>
    </Layout>
  );
}

