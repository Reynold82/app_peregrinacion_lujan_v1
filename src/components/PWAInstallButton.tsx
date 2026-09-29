import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-xs font-bold transition shadow-sm"
        title="Instalar App de Peregrinación en tu celular"
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">Instalar PWA</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest transition shadow-sm"
          title="Instalar en iPhone"
        >
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">PWA iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>Para usar la app en la ruta sin conexión:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <li>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en Safari.</li>
                  <li>Desliza hacia abajo y selecciona <strong>«Agregar a Inicio»</strong>.</li>
                  <li>Confirma tocando <strong>«Agregar»</strong>.</li>
                </ol>
                <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  ✨ Funcionará offline en plena Ruta Nacional 7 sin consumir datos adicionales.
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
