import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getSocket } from '../lib/socket';

export default function Host() {
  const [socket, setSocket] = useState(null);
  const [lobbyCode, setLobbyCode] = useState('----');
  const [players, setPlayers] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Waiting for players to join...');
  const [gameStarted, setGameStarted] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);

  useEffect(() => {
    const newSocket = getSocket('/lobby');
    setSocket(newSocket);

    // Create lobby as host
    newSocket.emit('createLobby', { username: 'HOST', userId: null }, (res) => {
      if (res?.error) {
        alert(res.error);
        return;
      }
      setLobbyCode(res.code);
    });

    // Socket event listeners
    newSocket.on('playerListUpdate', (playerList) => {
      setPlayers(playerList);
      if (playerList.length === 0) {
        setStatusMessage('Waiting for players to join...');
      } else {
        setStatusMessage(`${playerList.length} player(s) connected. Ready to start!`);
      }
    });

    newSocket.on('hostGameStarted', ({ game, gameId }) => {
      setCurrentGame(game);
      setGameStarted(true);
    });

    newSocket.on('lobbyClosed', () => {
      alert('Lobby was closed.');
      window.location.reload();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  function endGame() {
    if (socket && lobbyCode) {
      socket.emit('endLobby', lobbyCode);
      window.location.reload();
    }
  }

  return (
    <Layout 
      title="Host Game"
      description="Host a multiplayer party game on your TV screen. Share your lobby code with friends to join the game from their devices."
      url="/host"
      noindex={true}
    >
      <div className="host-container">
        {!gameStarted ? (
          <div>
            <div className="lobby-code">
              <div>Lobby Code</div>
              <div className="code-display">{lobbyCode}</div>
              <div style={{ fontSize: '0.8em', opacity: 0.9 }}>Share this code with players</div>
            </div>
            
            <div className="host-controls">
              <h3>Players Connected: {players.length}</h3>
              <ul id="playerList">
                {players.map((player, index) => (
                  <li key={index}>{player}</li>
                ))}
              </ul>
              
              <h3>Game Selection:</h3>
              <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                <strong>Players select games on their devices!</strong><br />
              </div>
            </div>
            
            <div className="status-message">
              {statusMessage}
            </div>
          </div>
        ) : (
          <div>
            <h2>Game in Progress...</h2>
            {currentGame && (
              <div>
                <h3>{currentGame.name}</h3>
                <p>Game is running! Players are now playing on their devices.</p>
                <button onClick={endGame} style={{ background: '#dc3545', marginTop: '20px' }}>
                  End Game
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .host-container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          padding: 40px;
          max-width: 800px;
          width: 90%;
          text-align: center;
          margin: 20px auto;
        }
        
        .code-display {
          font-size: 3em;
          letter-spacing: 0.2em;
          margin: 10px 0;
        }
        
        .host-controls {
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
        }
        
        .status-message {
          font-size: 1.2em;
          margin: 20px 0;
          padding: 15px;
          background: #e3f2fd;
          border-radius: 10px;
          border-left: 4px solid #2196f3;
        }
        
        h3 {
          color: #333;
          margin: 20px 0 10px 0;
        }
      `}</style>
    </Layout>
  );
}

