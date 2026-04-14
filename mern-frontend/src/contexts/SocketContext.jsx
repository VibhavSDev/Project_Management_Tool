import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../shared/useAuth';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token && user) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        withCredentials: true,
      });

      newSocket.emit('join', user.id); // Join personal room
      setSocket(newSocket);

      return () => newSocket.disconnect();
    }
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
