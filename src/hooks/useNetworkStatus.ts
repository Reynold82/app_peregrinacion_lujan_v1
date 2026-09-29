import { useState, useEffect, useCallback } from 'react';
import { getPendingSyncCount, syncRegistrosConNube } from '../db/db';

export interface NetworkSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncNow: () => Promise<{ success: boolean; totalSincronizados: number }>;
  refreshPendingCount: () => Promise<number>;
}

export function useNetworkStatus(): NetworkSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
    return count;
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await syncRegistrosConNube();
      await refreshPendingCount();
      if (res.success) {
        setLastSyncTime(new Date());
      }
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-sincronizar registros pendientes al recuperar señal
      const pending = await getPendingSyncCount();
      if (pending > 0) {
        syncNow();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Revisar conteo de pendientes cada 15 seg
    const interval = setInterval(refreshPendingCount, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount, syncNow]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    syncNow,
    refreshPendingCount,
  };
}
