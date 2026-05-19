'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  namespace?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
) {
  const {
    namespace = '',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const socketUrl = namespace ? `${url}${namespace}` : url;
    const socket = io(socketUrl, {
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setState({ connected: true, connecting: false, error: null });
    });

    socket.on('disconnect', (reason) => {
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false,
        error: reason === 'io client disconnect' ? null : `Disconnected: ${reason}`
      }));
    });

    socket.on('connect_error', (error) => {
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: `Connection error: ${error.message}` 
      }));
    });

    socketRef.current = socket;
  }, [url, namespace, reconnection, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({ connected: false, connecting: false, error: null });
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => socketRef.current?.off(event, callback);
    }
    return () => {};
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  const subscribe = useCallback((event: string, callback: (...args: any[]) => void) => {
    return on(event, callback);
  }, [on]);

  const unsubscribe = useCallback((event: string, callback?: ((...args: any[]) => void) | undefined) => {
    off(event, callback);
  }, [off]);

  const send = useCallback((event: string, data?: any) => {
    emit(event, data);
  }, [emit]);

  return {
    socket: socketRef.current,
    state,
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected: state.connected,
    subscribe,
    unsubscribe,
    send,
  };
}