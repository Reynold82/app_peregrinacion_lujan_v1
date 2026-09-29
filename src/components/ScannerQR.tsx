import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Zap, ZapOff, RefreshCw, AlertCircle, PlayCircle, ShieldCheck } from 'lucide-react';

interface ScannerQRProps {
  onScanSuccess: (decodedText: string) => void;
  onSimulateDemo: () => void;
}

export const ScannerQR: React.FC<ScannerQRProps> = ({
  onScanSuccess,
  onSimulateDemo,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-camera-viewport';
  
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashSupported, setFlashSupported] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    const startScanner = async () => {
      try {
        setCameraError(null);
        html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: currentFacingMode },
          config,
          (decodedText) => {
            // Vibra al detectar si el dispositivo lo soporta
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try { navigator.vibrate(100); } catch (e) { /* ignore */ }
            }
            onScanSuccess(decodedText);
          },
          () => {
            // Frame ignorado sin QR
          }
        );

        setIsScanning(true);

        // Check torch capability
        try {
          const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
          if (track && track.torchFeature && track.torchFeature().isSupported()) {
            setFlashSupported(true);
          }
        } catch (e) {
          // ignore
        }
      } catch (err: any) {
        console.warn('No se pudo acceder a la cámara nativa:', err);
        setCameraError(
          'Cámara en espera o no autorizada. Puedes habilitar permisos o usar el simulador y búsqueda manual.'
        );
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((err) => console.warn('Error al detener cámara:', err));
      }
    };
  }, [currentFacingMode, onScanSuccess]);

  const toggleFlash = async () => {
    if (!scannerRef.current || !flashSupported) return;
    try {
      const newFlash = !flashOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: newFlash }],
      });
      setFlashOn(newFlash);
    } catch (e) {
      console.warn('Error cambiando linterna:', e);
    }
  };

  const switchCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setCurrentFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      });
    } else {
      setCurrentFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 text-white">
      {/* Fondo simulación de terreno en ruta */}
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80 pointer-events-none" />

      {/* Camera feed viewport container for html5-qrcode */}
      <div 
        id={containerId} 
        className="absolute inset-0 w-full h-full object-cover flex items-center justify-center overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
      />

      {/* Top Bar of the Camera Viewport */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/50">
          <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            {isScanning ? 'Escáner QR Activo' : 'Cámara en Espera'}
          </span>
        </div>

        {/* Controls: Torch & Camera flip */}
        <div className="flex items-center gap-2">
          {flashSupported && (
            <button
              onClick={toggleFlash}
              type="button"
              className={`w-10 h-10 rounded-xl backdrop-blur-md flex items-center justify-center transition active:scale-95 border ${
                flashOn 
                  ? 'bg-amber-400 text-slate-950 border-amber-300' 
                  : 'bg-slate-900/70 text-slate-200 border-slate-700/50 hover:bg-slate-800'
              }`}
              title="Alternar Linterna"
            >
              {flashOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={switchCamera}
            type="button"
            className="w-10 h-10 rounded-xl bg-slate-900/70 text-slate-200 border border-slate-700/50 backdrop-blur-md hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
            title="Cambiar Cámara (Frontal / Trasera)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Reticle Frame Overlay */}
      <div className="relative z-10 self-center my-auto flex flex-col items-center pointer-events-none">
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* Top Left Corner */}
          <span className="absolute top-0 left-0 w-8 h-8 rounded-tl-xl border-t-4 border-l-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          {/* Top Right Corner */}
          <span className="absolute top-0 right-0 w-8 h-8 rounded-tr-xl border-t-4 border-r-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          {/* Bottom Left Corner */}
          <span className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-xl border-b-4 border-l-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          {/* Bottom Right Corner */}
          <span className="absolute bottom-0 right-0 w-8 h-8 rounded-br-xl border-b-4 border-r-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />

          {/* Laser scanning line effect */}
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
        </div>

        <p className="mt-3 text-xs sm:text-sm text-slate-200 text-center px-4 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-800">
          Enfoca el código QR de la credencial oficial o pulsera
        </p>
      </div>

      {/* Bottom status and direct Simulation Action */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Lector de alta velocidad • Modo Terreno</span>
        </div>

        <button
          onClick={onSimulateDemo}
          type="button"
          className="w-full sm:w-auto h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
        >
          <PlayCircle className="w-4 h-4 text-emerald-600" />
          <span>Simular Escaneo Exitoso</span>
        </button>
      </div>

      {/* Warning when camera has permission issue or not active */}
      {cameraError && !isScanning && (
        <div className="absolute inset-x-4 top-16 z-20 p-3 rounded-xl bg-amber-950/90 border border-amber-600/70 text-amber-200 text-xs flex items-center gap-2 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
};
