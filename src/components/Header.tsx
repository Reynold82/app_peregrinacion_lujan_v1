import React from 'react';
import { Church, Wifi, WifiOff, RefreshCw, QrCode, LayoutDashboard, Printer, Download } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { PostaNombre } from '../types';

export type AppView = 'toma-en-ruta' | 'dashboard-coordinacion' | 'impresion-de-credenciales';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
  activePosta: PostaNombre;
  tomadorNombre: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  isOnline,
  pendingCount,
  isSyncing,
  onSync,
  activePosta,
  tomadorNombre,
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="h-14 sm:h-16 w-full max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2">
          {/* Logo & Church Titling */}
          <div 
            onClick={() => onNavigate('dashboard-coordinacion')} 
            className="flex items-center gap-2 shrink-0 cursor-pointer select-none"
          >
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white shadow-xs">
              <Church className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight leading-tight">
                Pqa. Ntra. Sra. de Luján
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                SARANDÍ • PEREGRINACIÓN 2026
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            <button
              onClick={() => onNavigate('toma-en-ruta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'toma-en-ruta'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toma en Ruta
            </button>
            <button
              onClick={() => onNavigate('dashboard-coordinacion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'dashboard-coordinacion'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard Coordinación
            </button>
            <button
              onClick={() => onNavigate('impresion-de-credenciales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'impresion-de-credenciales'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Credenciales
            </button>
          </nav>

          {/* Right Status Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Online / Offline status */}
            {isOnline ? (
              <div 
                onClick={pendingCount > 0 ? onSync : undefined}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold cursor-pointer transition ${
                  pendingCount > 0
                    ? 'bg-amber-50 text-amber-900 border border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
                title={pendingCount > 0 ? `${pendingCount} registros pendientes. Toca para sincronizar.` : 'Conexión activa'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'}`} />
                <Wifi className="w-3 h-3" />
                <span>{pendingCount > 0 ? `${pendingCount} pend.` : 'Online'}</span>
                {pendingCount > 0 && (
                  <RefreshCw className={`w-3 h-3 ml-0.5 ${isSyncing ? 'animate-spin' : ''}`} />
                )}
              </div>
            ) : (
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-bold"
                title="Modo sin conexión. Guardando en el teléfono."
              >
                <WifiOff className="w-3 h-3 text-rose-600 animate-pulse" />
                <span>Offline {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
              </div>
            )}

            {/* Puesto Activo */}
            <div className="hidden sm:flex flex-col items-end px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-right">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Puesto Activo</span>
              <span className="text-xs font-bold text-slate-900 truncate max-w-[110px]">{activePosta}</span>
            </div>

            {/* Descargar Código Fuente ZIP */}
            <a
              href="/proyecto_lujan.tar.gz"
              download="proyecto_lujan.tar.gz"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
              title="Descargar código fuente completo empaquetado para tu máquina o GitHub"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Descargar Código</span>
            </a>

            {/* PWA Install */}
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Mobile Ergonomic Bottom Navigation Bar (Diseñado especialmente para uso con una sola mano en celulares) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] px-2 py-1 flex items-center justify-around">
        <button
          onClick={() => onNavigate('toma-en-ruta')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition ${
            currentView === 'toma-en-ruta' 
              ? 'text-slate-950 font-black' 
              : 'text-slate-500 font-semibold hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'toma-en-ruta' ? 'bg-slate-900 text-white' : ''}`}>
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight">Toma en Ruta</span>
        </button>

        <button
          onClick={() => onNavigate('dashboard-coordinacion')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition ${
            currentView === 'dashboard-coordinacion' 
              ? 'text-slate-950 font-black' 
              : 'text-slate-500 font-semibold hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'dashboard-coordinacion' ? 'bg-slate-900 text-white' : ''}`}>
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight">Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('impresion-de-credenciales')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition ${
            currentView === 'impresion-de-credenciales' 
              ? 'text-slate-950 font-black' 
              : 'text-slate-500 font-semibold hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-lg ${currentView === 'impresion-de-credenciales' ? 'bg-slate-900 text-white' : ''}`}>
            <Printer className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight">Credenciales</span>
        </button>
      </nav>
    </>
  );
};
