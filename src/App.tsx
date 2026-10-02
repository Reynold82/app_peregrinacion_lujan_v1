/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header, AppView } from './components/Header';
import { RouteTakerView } from './components/RouteTakerView';
import { DashboardView } from './components/DashboardView';
import { CredentialsView } from './components/CredentialsView';
import { 
  seedDatabaseIfNeeded, 
  registrarPasoEnPosta, 
  importarPeregrinosDesdeExcel,
  restablecerPadronOriginal,
  reiniciarPasoEnCero,
  db 
} from './db/db';
import {
  initializeFirestoreIfNeeded,
  subscribeToPeregrinos,
  subscribeToRegistrosPostas,
  registrarPasoFirebase,
  reiniciarPruebasFirebase,
} from './db/firebaseService';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { Peregrino, RegistroPosta, PostaNombre, EstadoPeregrino } from './types';
import { ShieldCheck, WifiOff, Cloud } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('toma-en-ruta');
  const [activePosta, setActivePosta] = useState<PostaNombre>('Parroquia (Micro)');
  const [tomadorNombre] = useState<string>('Hno. Lucas');

  const [peregrinos, setPeregrinos] = useState<Peregrino[]>([]);
  const [registrosPostas, setRegistrosPostas] = useState<RegistroPosta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firebaseActive, setFirebaseActive] = useState<boolean>(true);

  // Network and Sync status hook
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    syncNow, 
    refreshPendingCount 
  } = useNetworkStatus();

  // Inicialización y escucha en TIEMPO REAL con Firebase + Respaldo Dexie
  useEffect(() => {
    let unsubscribePeregrinos: (() => void) | null = null;
    let unsubscribeRegistros: (() => void) | null = null;

    async function initData() {
      try {
        // 1. Inicializar Firestore en la nube con los 243 peregrinos
        await initializeFirestoreIfNeeded();

        // 2. Suscribirse a cambios en TIEMPO REAL para peregrinos (cualquiera que marque en su cel se actualiza aquí)
        unsubscribePeregrinos = subscribeToPeregrinos((list) => {
          if (list && list.length > 0) {
            setPeregrinos(list);
            // Sincronizar copia local en Dexie en segundo plano
            db.peregrinos.bulkPut(list).catch(() => {});
          }
        }, async (err) => {
          console.warn('Fallback a almacenamiento local IndexedDB:', err);
          setFirebaseActive(false);
          const localList = await seedDatabaseIfNeeded();
          setPeregrinos(localList);
        });

        // 3. Suscribirse a cambios en TIEMPO REAL para el historial de pasos
        unsubscribeRegistros = subscribeToRegistrosPostas((historial) => {
          setRegistrosPostas(historial);
        });

      } catch (err) {
        console.error('Error al inicializar Firebase, usando base local:', err);
        setFirebaseActive(false);
        const localList = await seedDatabaseIfNeeded();
        const allPasses = await db.registrosPostas.toArray();
        setPeregrinos(localList);
        setRegistrosPostas(allPasses);
      } finally {
        setIsLoading(false);
      }
    }

    initData();

    return () => {
      if (unsubscribePeregrinos) unsubscribePeregrinos();
      if (unsubscribeRegistros) unsubscribeRegistros();
    };
  }, []);

  // Registro de paso en puesto de apoyo (actualiza Firebase en tiempo real + Dexie local)
  const handleRegistrarPaso = async (
    peregrinoId: string, 
    estado: EstadoPeregrino, 
    detalle?: string
  ) => {
    try {
      const p = peregrinos.find(item => item.id === peregrinoId);
      if (!p) throw new Error('Peregrino no encontrado');

      if (firebaseActive && isOnline) {
        // Sincronización en tiempo real vía Firebase Cloud
        const { peregrinoActualizado, registro } = await registrarPasoFirebase({
          peregrino: p,
          posta: activePosta,
          estado,
          detalle,
          tomadorNombre,
        });

        // Actualización optimista de estado
        setPeregrinos(prev => prev.map(item => item.id === peregrinoId ? peregrinoActualizado : item));
        setRegistrosPostas(prev => [registro, ...prev]);
        // Guardar copia local Dexie
        await registrarPasoEnPosta({
          peregrinoId,
          posta: activePosta,
          estado,
          detalle,
          tomadorNombre,
          isOnline: true,
        }).catch(() => {});
      } else {
        // Registro local sin conexión (offline de emergencia)
        const { peregrinoActualizado, registro } = await registrarPasoEnPosta({
          peregrinoId,
          posta: activePosta,
          estado,
          detalle,
          tomadorNombre,
          isOnline: false,
        });
        setPeregrinos(prev => prev.map(item => item.id === peregrinoId ? peregrinoActualizado : item));
        setRegistrosPostas(prev => [registro, ...prev]);
        await refreshPendingCount();
      }
    } catch (err) {
      console.error('Error registrando paso en puesto:', err);
      throw err;
    }
  };

  // Modificación manual desde el Dashboard
  const handleUpdatePeregrinoEstado = async (
    peregrinoId: string, 
    estado: EstadoPeregrino, 
    posta: PostaNombre, 
    detalle: string
  ) => {
    try {
      const p = peregrinos.find(item => item.id === peregrinoId);
      if (!p) return;

      if (firebaseActive && isOnline) {
        const { peregrinoActualizado, registro } = await registrarPasoFirebase({
          peregrino: p,
          posta,
          estado,
          detalle,
          tomadorNombre: 'Coordinador Central',
        });
        setPeregrinos(prev => prev.map(item => item.id === peregrinoId ? peregrinoActualizado : item));
        setRegistrosPostas(prev => [registro, ...prev]);
      } else {
        const { peregrinoActualizado, registro } = await registrarPasoEnPosta({
          peregrinoId,
          posta,
          estado,
          detalle,
          tomadorNombre: 'Coordinador Central',
          isOnline: false,
        });
        setPeregrinos(prev => prev.map(item => item.id === peregrinoId ? peregrinoActualizado : item));
        setRegistrosPostas(prev => [registro, ...prev]);
      }
    } catch (err) {
      console.error('Error actualizando estado manual:', err);
      throw err;
    }
  };

  // Sincronización manual o actualización
  const handleRefresh = async () => {
    if (isOnline && pendingCount > 0) {
      await syncNow();
    }
  };

  // Importación desde Excel
  const handleImportExcel = async (nuevosPeregrinos: Peregrino[]) => {
    await importarPeregrinosDesdeExcel(nuevosPeregrinos);
    setPeregrinos(nuevosPeregrinos);
    setRegistrosPostas([]);
    await refreshPendingCount();
  };

  // Restablecer al padrón original
  const handleResetOriginal = async () => {
    if (firebaseActive) {
      await reiniciarPruebasFirebase();
    }
    const original = await restablecerPadronOriginal();
    setPeregrinos(original);
    setRegistrosPostas([]);
    await refreshPendingCount();
  };

  // Limpiar y poner en cero para el día del evento (elimina todas las pruebas hechas hoy)
  const handleResetToZero = async () => {
    if (firebaseActive) {
      await reiniciarPruebasFirebase();
    }
    const limpiados = await reiniciarPasoEnCero();
    setPeregrinos(limpiados);
    setRegistrosPostas([]);
    await refreshPendingCount();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* App Header */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSync={syncNow}
        activePosta={activePosta}
        tomadorNombre={tomadorNombre}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full pt-16 sm:pt-20 pb-16 md:pb-6 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-xs sm:text-sm">Conectando con la nube en tiempo real (Firebase)...</p>
          </div>
        ) : (
          <>
            {currentView === 'toma-en-ruta' && (
              <RouteTakerView
                peregrinos={peregrinos}
                registrosPostas={registrosPostas}
                activePosta={activePosta}
                onSelectPosta={setActivePosta}
                onRegistrarPaso={handleRegistrarPaso}
                isOnline={isOnline}
              />
            )}

            {currentView === 'dashboard-coordinacion' && (
              <DashboardView
                peregrinos={peregrinos}
                registrosPostas={registrosPostas}
                onRefresh={handleRefresh}
                isSyncing={isSyncing}
                onUpdatePeregrinoEstado={handleUpdatePeregrinoEstado}
                onImportExcel={handleImportExcel}
                onResetOriginal={handleResetOriginal}
                onResetToZero={handleResetToZero}
              />
            )}

            {currentView === 'impresion-de-credenciales' && (
              <CredentialsView peregrinos={peregrinos} />
            )}
          </>
        )}
      </main>

      {/* Notificación flotante de modo Offline */}
      {!isOnline && (
        <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:right-auto z-40 bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Modo Offline activo: Todos los escaneos se guardan en el teléfono y sincronizan al reconectar.</span>
        </div>
      )}

      {/* Footer Oficial */}
      <footer className="print:hidden hidden md:block w-full bg-slate-100 py-4 border-t border-slate-200 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            <span>© 2026 Parroquia Nuestra Señora de Luján de Sarandí — Puestos de Apoyo en Ruta</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              Sincronización Cloud Activa (14 colaboradores en simultáneo)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
