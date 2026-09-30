import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  Zap, 
  ZapOff, 
  RefreshCw, 
  AlertCircle, 
  PlayCircle, 
  ShieldCheck, 
  HelpCircle, 
  RotateCcw, 
  CheckCircle2, 
  X,
  Smartphone,
  Lock,
  Globe
} from 'lucide-react';

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
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashSupported, setFlashSupported] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState<boolean>(false);
  const [diagnosticsInfo, setDiagnosticsInfo] = useState<{
    hasGetUserMedia: boolean;
    isHttps: boolean;
    permissionStatus: string;
  }>({
    hasGetUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    isHttps: typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost'),
    permissionStatus: 'desconocido'
  });

  // Consultar estado de permisos
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && (navigator.permissions as any).query) {
      (navigator.permissions as any).query({ name: 'camera' })
        .then((res: any) => {
          setDiagnosticsInfo(prev => ({ ...prev, permissionStatus: res.state }));
          res.onchange = () => {
            setDiagnosticsInfo(prev => ({ ...prev, permissionStatus: res.state }));
          };
        })
        .catch(() => {
          // ignore
        });
    }
  }, []);

  const handleRetryCamera = useCallback(() => {
    setIsInitializing(true);
    setCameraError(null);
    setRetryNonce(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let html5QrCode: Html5Qrcode;

    const stopExistingScanner = async () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (e) {
          console.warn('Limpieza previa de scanner:', e);
        }
        scannerRef.current = null;
      }
    };

    const startScanner = async () => {
      setIsInitializing(true);
      setCameraError(null);

      // Esperar brevemente para que el contenedor esté limpio en el DOM
      await new Promise(r => setTimeout(r, 200));
      if (isCancelled) return;

      try {
        await stopExistingScanner();
        if (isCancelled) return;

        html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39
          ],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        // Configuración responsive para calcular el tamaño óptimo de detección
        const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.max(160, Math.floor(minEdge * 0.75));
          return {
            width: qrboxSize,
            height: qrboxSize,
          };
        };

        const config = {
          fps: 15,
          qrbox: qrboxFunction,
          disableFlip: currentFacingMode === 'environment',
        };

        await html5QrCode.start(
          { facingMode: currentFacingMode },
          config,
          (decodedText) => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try { navigator.vibrate(100); } catch (e) { /* ignore */ }
            }
            onScanSuccess(decodedText);
          },
          () => {
            // Frame sin QR detectado aún
          }
        );

        if (!isCancelled) {
          setIsScanning(true);
          setIsInitializing(false);

          try {
            const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
            if (track && track.torchFeature && track.torchFeature().isSupported()) {
              setFlashSupported(true);
            }
          } catch (e) {
            // torch no disponible
          }
        }
      } catch (err: any) {
        console.warn('Fallo al inicializar cámara nativa:', err);
        if (!isCancelled) {
          setIsScanning(false);
          setIsInitializing(false);
          
          const errString = String(err?.message || err).toLowerCase();
          if (errString.includes('notallowederror') || errString.includes('permission')) {
            setCameraError('Permiso de cámara denegado. Habilita el acceso en los ajustes de tu navegador.');
          } else if (errString.includes('notfounderror') || errString.includes('no camera')) {
            setCameraError('No se encontró ninguna cámara disponible en este dispositivo.');
          } else if (errString.includes('notreadableerror') || errString.includes('in use')) {
            setCameraError('La cámara está en uso por otra app (WhatsApp, Instagram o la app de Cámara). Ciérrala e intenta de nuevo.');
          } else {
            setCameraError('No se pudo establecer el flujo de video de la cámara en vivo.');
          }
        }
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => scannerRef.current?.clear())
            .catch((err) => console.warn('Error al detener cámara:', err));
        } else {
          try { scannerRef.current.clear(); } catch(e) {}
        }
      }
    };
  }, [currentFacingMode, onScanSuccess, retryNonce]);

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
    <>
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 text-white">
        {/* Fondo de espera: solo se muestra si NO está escaneando */}
        {!isScanning && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
            {isInitializing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <span className="text-sm font-bold text-slate-200">Iniciando lente de la cámara...</span>
                <span className="text-xs text-slate-400">Solicitando sensor óptico al navegador</span>
              </div>
            ) : cameraError ? (
              /* CAPA DE DIAGNÓSTICO PARA FALLO DE FLUJO DE VIDEO */
              <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/40 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3 shadow-2xl text-center backdrop-blur-md animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Flujo de Cámara No Disponible
                  </h3>
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    {cameraError}
                  </p>
                </div>

                {/* Resumen de Diagnóstico Técnico */}
                <div className="w-full bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 text-[11px] text-slate-300 flex flex-col gap-1 text-left">
                  <div className="flex items-center justify-between">
                    <span>Protocolo Seguro (HTTPS):</span>
                    <span className={diagnosticsInfo.isHttps ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {diagnosticsInfo.isHttps ? 'Sí (Correcto)' : 'No (Inseguro)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Permiso en Navegador:</span>
                    <span className="capitalize font-bold text-amber-300">
                      {diagnosticsInfo.permissionStatus}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción Inmediata: Reintentar y Guía */}
                <div className="flex items-center gap-2 w-full pt-1">
                  <button
                    onClick={handleRetryCamera}
                    type="button"
                    className="flex-1 h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reintentar Cámara</span>
                  </button>

                  <button
                    onClick={() => setShowTroubleshootModal(true)}
                    type="button"
                    className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Guía de Solución</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Camera feed viewport container for html5-qrcode */}
        <div 
          id={containerId} 
          className="absolute inset-0 w-full h-full z-0 overflow-hidden"
        />

        {/* Top Bar of the Camera Viewport */}
        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700/50">
            <Camera className={`w-4 h-4 ${isScanning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              {isScanning ? 'Escáner QR Activo' : 'Cámara en Espera'}
            </span>
          </div>

          {/* Controls: Torch, Camera flip, Retry & Help */}
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
              onClick={handleRetryCamera}
              type="button"
              className="w-10 h-10 rounded-xl bg-slate-900/70 text-slate-200 border border-slate-700/50 backdrop-blur-md hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
              title="Reiniciar Cámara"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={switchCamera}
              type="button"
              className="w-10 h-10 rounded-xl bg-slate-900/70 text-slate-200 border border-slate-700/50 backdrop-blur-md hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
              title="Cambiar Cámara (Frontal / Trasera)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowTroubleshootModal(true)}
              type="button"
              className="w-10 h-10 rounded-xl bg-slate-900/70 text-amber-300 border border-slate-700/50 backdrop-blur-md hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
              title="Guía de ayuda para la cámara"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Target Reticle Frame Overlay (Solo visible durante escaneo activo) */}
        {isScanning && (
          <div className="relative z-10 self-center my-auto flex flex-col items-center pointer-events-none">
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
              {/* Corners */}
              <span className="absolute top-0 left-0 w-8 h-8 rounded-tl-xl border-t-4 border-l-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <span className="absolute top-0 right-0 w-8 h-8 rounded-tr-xl border-t-4 border-r-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <span className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-xl border-b-4 border-l-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <span className="absolute bottom-0 right-0 w-8 h-8 rounded-br-xl border-b-4 border-r-4 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />

              {/* Laser scanning line effect */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
            </div>

            <p className="mt-3 text-xs sm:text-sm text-slate-200 text-center px-4 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-800">
              Enfoca el código QR de la credencial oficial o pulsera
            </p>
          </div>
        )}

        {/* Bottom status and direct Simulation Action */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Lector estándar ISO/IEC 18004 • Modo Terreno</span>
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
      </div>

      {/* MODAL GUÍA DE SOLUCIÓN DE PROBLEMAS CON LA CÁMARA */}
      {showTroubleshootModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header del Modal */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-sm sm:text-base">Guía de Solución de Cámara Móvil</h3>
              </div>
              <button
                onClick={() => setShowTroubleshootModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con Pasos Prácticos */}
            <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 text-xs sm:text-sm text-slate-700">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">¿Por qué puede fallar la cámara en el navegador móvil?</span>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Los teléfonos modernos protegen la privacidad y bloquean la cámara si otra app la está usando o si el permiso fue denegado temporalmente.
                  </p>
                </div>
              </div>

              {/* Paso 1 */}
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Verificar Permisos en el Candado</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Toca el ícono del <strong>candado o ajustes</strong> a la izquierda de la barra de direcciones de Chrome/Safari (donde dice la URL <em>appperegrinacionlujanv1.vercel.app</em>). Selecciona <strong>Permisos</strong> y asegúrate de que la <strong>Cámara</strong> esté en <strong>Permitir</strong>.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Cerrar otras aplicaciones que usen la cámara</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Si tienes abierta la app de Cámara de Android/iPhone, WhatsApp con cámara abierta, Instagram o TikTok, Android bloquea el lente para el navegador. Cierra las apps recientes en tu celular y toca <strong>"Reintentar Cámara"</strong>.
                  </p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Códigos QR Reales y Distancia de Enfoque</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ya generamos los códigos QR con el estándar internacional oficial (matriz densa de alta precisión). Mantén el celular a unos <strong>15 a 25 cm</strong> de la credencial o pantalla y con buena iluminación (puedes prender la linterna con el botón del rayo).
                  </p>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  4
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Plan de Contingencia: Búsqueda Manual</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    En caso de lluvia extrema, rotura del código QR impreso o falla de cámara, utiliza el buscador de abajo para registrar al peregrino con solo escribir 3 letras de su apellido o su DNI.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Luján 2026 • Soporte Móvil</span>
              <button
                onClick={() => {
                  setShowTroubleshootModal(false);
                  handleRetryCamera();
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition active:scale-95"
              >
                Entendido y Reintentar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

