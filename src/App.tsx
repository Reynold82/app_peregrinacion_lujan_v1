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
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { Peregrino, RegistroPosta, PostaNombre, EstadoPeregrino } from './types';
import { ShieldCheck, WifiOff } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('toma-en-ruta');
  const [activePosta, setActivePosta] = useState<PostaNombre>('Parroquia (Micro)');
  const [tomadorNombre] = useState<string>('Hno. Lucas');

  const [peregrinos, setPeregrinos] = useState<Peregrino[]>([]);
  const [registrosPostas, setRegistrosPostas] = useState<RegistroPosta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Network and Sync status hook
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    syncNow, 
    refreshPendingCount 
  } = useNetworkStatus();

  // Load database from Dexie on startup
  const loadData = useCallback(async () => {
    try {
      const allPilgrims = await seedDatabaseIfNeeded();
      const allPasses = await db.registrosPostas.toArray();
      setPeregrinos(allPilgrims);
      setRegistrosPostas(allPasses);
      await refreshPendingCount();
    } catch (e) {
      console.error('Error cargando datos de Dexie:', e);
    } finally {
      setIsLoading(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Registro de paso en puesto de apoyo (concurrente con Dexie y estado en memoria)
  const handleRegistrarPaso = async (
    peregrinoId: string, 
    estado: EstadoPeregrino, 
    detalle?: string
  ) => {
    try {
      const { peregrinoActualizado, registro } = await registrarPasoEnPosta({
        peregrinoId,
        posta: activePosta,
        estado,
        detalle,
        tomadorNombre,
        isOnline,
      });

      setPeregrinos(prev => prev.map(p => p.id === peregrinoId ? peregrinoActualizado : p));
      setRegistrosPostas(prev => [registro, ...prev]);
      await refreshPendingCount();
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
      const { peregrinoActualizado, registro } = await registrarPasoEnPosta({
        peregrinoId,
        posta,
        estado,
        detalle,
        tomadorNombre: 'Coordinador Central',
        isOnline,
      });

      setPeregrinos(prev => prev.map(p => p.id === peregrinoId ? peregrinoActualizado : p));
      setRegistrosPostas(prev => [registro, ...prev]);
      await refreshPendingCount();
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
    await loadData();
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
    const original = await restablecerPadronOriginal();
    setPeregrinos(original);
    const allPasses = await db.registrosPostas.toArray();
    setRegistrosPostas(allPasses);
    await refreshPendingCount();
  };

  // Limpiar y poner en cero para el día del evento
  const handleResetToZero = async () => {
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

      {/* Main View Container con padding ajustado para celulales y barra inferior */}
      <main className="flex-1 w-full pt-16 sm:pt-20 pb-16 md:pb-6 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-xs sm:text-sm">Cargando padrón en el celular (Dexie.js)...</p>
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
          <span>Modo Offline activo: Todos los escaneos se guardan localmente en el teléfono.</span>
        </div>
      )}

      {/* Footer Oficial (Oculto en móvil con barra inferior para evitar solapamientos) */}
      <footer className="print:hidden hidden md:block w-full bg-slate-100 py-4 border-t border-slate-200 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            <span>© 2026 Parroquia Nuestra Señora de Luján de Sarandí — Puestos de Apoyo en Ruta</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronización P2P Mesh
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
