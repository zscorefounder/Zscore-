import { useState, useEffect } from 'react';
import { onFirestoreStatusChange } from '../firebase';

export function useFirestoreStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    return onFirestoreStatusChange((status) => {
      setIsConnected(status);
    });
  }, []);

  return isConnected;
}
