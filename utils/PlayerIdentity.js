/**
 * PlayerIdentity - Standardized Player Management Utilities
 * 
 * Provides utilities for managing player identity across reconnections.
 * Uses username as the persistent identifier, with socket.id only for message routing.
 */

/**
 * Get player by username from lobby
 * @param {Object} lobby - Lobby object
 * @param {string} username - Player username
 * @returns {Object|null} Player object or null if not found
 */
function getPlayerByUsername(lobby, username) {
  if (!lobby || !lobby.players) return null;
  
  // Check if lobby.players is an array or object
  if (Array.isArray(lobby.players)) {
    return lobby.players.find(p => p.username === username) || null;
  }
  
  // If it's an object keyed by username
  return lobby.players[username] || null;
}

/**
 * Get player by socket ID from lobby
 * @param {Object} lobby - Lobby object
 * @param {string} socketId - Socket ID
 * @returns {Object|null} Player object or null if not found
 */
function getPlayerBySocketId(lobby, socketId) {
  if (!lobby || !lobby.players) return null;
  
  // Check if lobby.players is an array or object
  if (Array.isArray(lobby.players)) {
    return lobby.players.find(p => p.id === socketId) || null;
  }
  
  // If it's an object, search values
  const players = Object.values(lobby.players);
  return players.find(p => p.id === socketId) || null;
}

/**
 * Check if a player object indicates a reconnection
 * @param {Object} player - Player object
 * @returns {boolean} True if this is a reconnection
 */
function isReconnection(player) {
  return player && (player.reconnected === true || player.previousSocketId !== undefined);
}

/**
 * Update player's socket ID in lobby
 * @param {Object} lobby - Lobby object
 * @param {string} username - Player username
 * @param {string} newSocketId - New socket ID
 * @returns {boolean} True if update was successful
 */
function updatePlayerSocketId(lobby, username, newSocketId) {
  const player = getPlayerByUsername(lobby, username);
  if (!player) return false;
  
  const previousSocketId = player.id;
  
  // Track socket ID history for debugging
  if (!player.socketIdHistory) {
    player.socketIdHistory = [];
  }
  if (previousSocketId && previousSocketId !== newSocketId) {
    player.socketIdHistory.push({
      socketId: previousSocketId,
      changedAt: Date.now()
    });
  }
  
  // Update socket ID
  player.id = newSocketId;
  player.previousSocketId = previousSocketId;
  player.reconnected = true;
  player.disconnectedAt = null;
  
  return true;
}

/**
 * Mark player as disconnected
 * @param {Object} lobby - Lobby object
 * @param {string} username - Player username
 * @returns {boolean} True if player was marked as disconnected
 */
function markPlayerDisconnected(lobby, username) {
  const player = getPlayerByUsername(lobby, username);
  if (!player) return false;
  
  player.disconnectedAt = Date.now();
  player.reconnected = false;
  
  return true;
}

/**
 * Create a standardized player object
 * @param {Object} params - Player parameters
 * @param {string} params.id - Socket ID
 * @param {string} params.username - Username (persistent identifier)
 * @param {string|null} params.userId - MongoDB user ID (if authenticated)
 * @returns {Object} Standardized player object
 */
function createPlayer({ id, username, userId = null }) {
  return {
    id,           // Current socket.id (changes on reconnect)
    username,     // Persistent identifier
    userId,       // MongoDB ID if authenticated
    socketIdHistory: [], // Track socket.id changes for debugging
    disconnectedAt: null,
    reconnected: false
  };
}

/**
 * Check if player exists in lobby by username
 * @param {Object} lobby - Lobby object
 * @param {string} username - Player username
 * @returns {boolean} True if player exists
 */
function playerExists(lobby, username) {
  return getPlayerByUsername(lobby, username) !== null;
}

/**
 * Get all players from lobby as array (normalizes array/object structure)
 * @param {Object} lobby - Lobby object
 * @returns {Array} Array of player objects
 */
function getAllPlayers(lobby) {
  if (!lobby || !lobby.players) return [];
  
  if (Array.isArray(lobby.players)) {
    return lobby.players;
  }
  
  return Object.values(lobby.players);
}

module.exports = {
  getPlayerByUsername,
  getPlayerBySocketId,
  isReconnection,
  updatePlayerSocketId,
  markPlayerDisconnected,
  createPlayer,
  playerExists,
  getAllPlayers
};

