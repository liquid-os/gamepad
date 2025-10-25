// Socket.IO client wrapper for Next.js
import { io } from 'socket.io-client';

let socket = null;

export const getSocket = (namespace = '/lobby') => {
  if (!socket || !socket.connected) {
    socket = io(namespace, {
      path: '/socket.io/',
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

