import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getSocket } from '../lib/socket';

export default function Play() {
  const router = useRouter();
  const { code: queryCode } = router.query;
  
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [lobbyCode, setLobbyCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentGameId, setCurrentGameId] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (queryCode && currentUser) {
      setLobbyCode(queryCode.toUpperCase());
      joinLobby(queryCode.toUpperCase());
    }
  }, [queryCode, currentUser]);

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

  function joinLobby(code) {
    const newSocket = getSocket('/lobby');
    setSocket(newSocket);

    const username = currentUser ? currentUser.username : "GUEST";
    const userId = currentUser ? currentUser.id : null;
    
    newSocket.emit('joinLobby', { code, username, userId }, (res) => {
      if (res?.error) {
        alert(res.error);
        router.push('/');
        return;
      }
      
      setLobbyCode(res.code);
      setGames(res.games);
    });

    // Socket event listeners
    newSocket.on('playerListUpdate', (playerList) => {
      setPlayers(playerList);
    });

    newSocket.on('playerGameStarted', ({ game, gameId }) => {
      setGameStarted(true);
      setCurrentGameId(gameId);
    });

    newSocket.on('lobbyClosed', () => {
      //alert('Lobby was closed by host.');
      router.push('/');
    });
  }

  function selectGame(gameId) {
    if (socket && lobbyCode) {
      socket.emit('selectGame', { code: lobbyCode, gameId: gameId });
    }
  }

  function leaveLobby() {
    if (confirm('Are you sure you want to exit the lobby?')) {
      if (socket && lobbyCode) {
        socket.emit('leaveLobby', { code: lobbyCode });
      }
      router.push('/');
    }
  }

  if (!currentUser) {
    return (
      <Layout title="Loading...">
        <div className="container">
          <h1>Loading...</h1>
          <p>Please wait while we check your authentication status...</p>
        </div>
      </Layout>
    );
  }

  if (gameStarted && currentGameId) {
    return (
      //<Layout title="Game - Party Game Hub">
        <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
          <iframe
            src={`/games/${currentGameId}/client/index.html`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
     // </Layout>
     // TODO - Add footer with slight top margin that can allow user to leave lobby
    );
  }

  return (
    <Layout title="Player Lobby - Party Game Hub">
      <div className="container" style={{ maxWidth: '600px' }}>
        <h1>Player Lobby</h1>
        
        <div className="lobby-code">Lobby Code: {lobbyCode}</div>
        
        <h3>Players in Lobby:</h3>
        <ul id="playerList">
          {players.map((player, index) => (
            <li key={index}>{player}</li>
          ))}
        </ul>
        
        <h3>Select a Game:</h3>
        <div id="gameList">
          {games.map((game) => (
            <div key={game.id} className="game-option" onClick={() => selectGame(game.id)}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{game.name}</div>
              <div className="game-info">{game.description || 'Fun party game!'}</div>
              <div className="game-players">👥 {game.minPlayers}-{game.maxPlayers} players</div>
            </div>
          ))}
        </div>
        
        <button onClick={leaveLobby} style={{ background: '#dc3545', marginTop: '20px' }}>
          🚪 Leave Lobby
        </button>
      </div>

      <style jsx>{`
        h3 {
          color: #333;
          margin: 20px 0 10px 0;
        }
      `}</style>
    </Layout>
  );
}

