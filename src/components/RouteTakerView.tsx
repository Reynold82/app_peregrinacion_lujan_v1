import React, { useState, useMemo } from 'react';
import { 
  Peregrino, 
  RegistroPosta, 
  PostaNombre, 
  EstadoPeregrino 
} from '../types';
import { POSTAS_INFO } from '../data/initialPilgrims';
import { ScannerQR } from './ScannerQR';
import { 
  CheckCircle, 
  CheckCircle2, 
  Radio, 
  Search, 
  ArrowRight, 
  UserCheck, 
  Bus, 
  UserX, 
  History, 
  Navigation, 
  BatteryCharging, 
  Phone, 
  Clock,
  Sparkles,
  QrCode,
  ScanLine,
  X
} from 'lucide-react';

interface RouteTakerViewProps {
  peregrinos: Peregrino[];
  registrosPostas: RegistroPosta[];
  activePosta: PostaNombre;
  onSelectPosta: (posta: PostaNombre) => void;
  onRegistrarPaso: (
    peregrinoId: string, 
    estado: EstadoPeregrino, 
    detalle?: string
  ) => Promise<void>;
  isOnline: boolean;
}

export const RouteTakerView: React.FC<RouteTakerViewProps> = ({
  peregrinos,
  registrosPostas,
  activePosta,
  onSelectPosta,
  onRegistrarPaso,
  isOnline,
}) => {
  // Peregrino detectado o seleccionado (inicia vacío a la espera del primer escaneo)
  const [selectedPeregrino, setSelectedPeregrino] = useState<Peregrino | null>(null);

  const [manualQuery, setManualQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Config del puesto de apoyo activo
  const puestoConfig = useMemo(() => {
    return POSTAS_INFO.find(p => p.nombre === activePosta) || POSTAS_INFO[1];
  }, [activePosta]);

  // Historial local del puesto activo con deduplicación estricta por ID
  const historialPuesto = useMemo(() => {
    const seen = new Set<string>();
    const uniqueList: RegistroPosta[] = [];

    const filtered = registrosPostas
      .filter(r => r.posta === activePosta)
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const r of filtered) {
      const key = r.id ? String(r.id) : `${r.peregrinoId}_${r.posta}_${r.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(r);
      }
    }

    return uniqueList.slice(0, 10);
  }, [registrosPostas, activePosta]);

  // Métricas del puesto activo (calculadas por peregrinos únicos registrados en la posta)
  const metricas = useMemo(() => {
    const uniquePeregrinosEnPosta = new Set(
      registrosPostas
        .filter(r => r.posta === activePosta)
        .map(r => r.peregrinoId)
    );
    const registrados = uniquePeregrinosEnPosta.size;
    const total = peregrinos.length;
    const pendientes = Math.max(0, total - registrados);
    const porcentaje = total > 0 ? ((registrados / total) * 100).toFixed(1) : '0';

    return { registrados, pendientes, total, porcentaje };
  }, [registrosPostas, activePosta, peregrinos.length]);

  // Coincidencias para búsqueda manual
  const sugerenciasManuales = useMemo(() => {
    if (!manualQuery.trim()) {
      return peregrinos.slice(0, 4);
    }
    const q = manualQuery.toLowerCase().trim();
    return peregrinos
      .filter(p => 
        p.nombre.toLowerCase().includes(q) ||
        p.apellido.toLowerCase().includes(q) ||
        p.idCorto.toLowerCase().includes(q) ||
        (p.dni && p.dni.toLowerCase().includes(q))
      )
      .slice(0, 4);
  }, [peregrinos, manualQuery]);

  const triggerFeedback = (text: string, type: 'success' | 'warning' | 'error') => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  // Manejo de decodificación QR
  const handleQRDecoded = (decodedText: string) => {
    let targetId = decodedText.trim();
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.id) targetId = parsed.id;
      if (parsed.idCorto) targetId = parsed.idCorto;
    } catch (e) {
      // String plano
    }

    const match = targetId.match(/PL-\d{3}/i);
    const foundId = match ? match[0].toUpperCase() : targetId;

    const found = peregrinos.find(
      p => p.id === foundId || p.idCorto.toUpperCase() === `#${foundId}` || (p.dni && p.dni.includes(targetId))
    );

    if (found) {
      setSelectedPeregrino(found);
      triggerFeedback(`¡QR identificado! ${found.nombre} ${found.apellido} (${found.idCorto})`, 'success');
    } else {
      triggerFeedback(`QR leído [${targetId}], no encontrado en el padrón 2026.`, 'warning');
    }
  };

  const handleSimulateDemo = () => {
    const candidates = peregrinos.slice(0, 10);
    const randomOne = candidates[Math.floor(Math.random() * candidates.length)] || peregrinos[0];
    if (randomOne) {
      setSelectedPeregrino(randomOne);
      triggerFeedback(`QR detectado: ${randomOne.nombre} ${randomOne.apellido} (${randomOne.idCorto})`, 'success');
    }
  };

  // Registro de acción de paso por puesto
  const handleAction = async (estado: EstadoPeregrino, detalle: string) => {
    if (!selectedPeregrino || isProcessing) return;

    setIsProcessing(true);
    try {
      await onRegistrarPaso(selectedPeregrino.id, estado, detalle);

      if (estado === 'CAMINANDO') {
        triggerFeedback(`¡Paso confirmado en Puesto ${activePosta}!`, 'success');
      } else if (estado === 'MOVIL_APOYO') {
        triggerFeedback(`Asignado a Móvil de Apoyo. Registrado localmente.`, 'warning');
      } else {
        triggerFeedback(`Retiro / Abandono registrado en Puesto ${activePosta}.`, 'error');
      }

      setSelectedPeregrino(prev => prev ? {
        ...prev,
        estadoActual: estado,
        subEstadoDetalle: detalle,
        ultimaPosta: activePosta,
        ultimoTimestamp: Date.now(),
      } : null);
    } catch (err: any) {
      triggerFeedback(`Error al registrar: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-20">
      {/* Banner de Estado Terreno en Celulares */}
      <div className="w-full bg-slate-200 text-slate-800 px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Terminal de Puesto:</span>
          <span className="font-mono font-bold text-slate-900">{activePosta.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-semibold">
            {isOnline ? '🟢 En línea' : '🟠 Sin conexión (Guardando local)'}
          </span>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col gap-4 sm:gap-6">
        {/* 1. SELECTOR DE PUESTOS DE APOYO (Barra Horizontal Desplazable) */}
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Puesto de Apoyo (Ruta Nacional 7)
            </span>
            <span className="text-[11px] font-bold text-slate-800">
              Paso {POSTAS_INFO.findIndex(p => p.nombre === activePosta) + 1} de {POSTAS_INFO.length}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none snap-x">
            {POSTAS_INFO.map((puesto) => {
              const isActive = puesto.nombre === activePosta;
              return (
                <button
                  key={puesto.id}
                  onClick={() => onSelectPosta(puesto.nombre)}
                  type="button"
                  className={`shrink-0 snap-start flex items-center gap-2 px-3 py-2 rounded-xl transition shadow-xs border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isActive ? (
                    <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-tight">{puesto.nombre}</span>
                    <span className={`text-[9px] leading-none ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                      Km {puesto.km}
                    </span>
                  </div>
                  {isActive && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-slate-900 text-[8px] font-black uppercase">
                      Activo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* FEEDBACK TOAST BANNER */}
        {feedback && (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-bold ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="flex-1">{feedback.text}</span>
          </div>
        )}

        {/* CORE WORKSPACE: Optimizado 100% para celulares (apilado limpio y claro) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* COLUMNA 1: Visor QR + Ficha de Peregrino Escaneado + Búsqueda Manual (7 cols en desktop) */}
          <section className="lg:col-span-7 flex flex-col gap-3.5">
            {/* 1. Visor de Cámara QR */}
            <ScannerQR
              onScanSuccess={handleQRDecoded}
              onSimulateDemo={handleSimulateDemo}
            />

            {/* 2. Tarjeta del Resultado de Escaneo (Inmediatamente debajo del visor QR) */}
            {selectedPeregrino ? (
              <div className="bg-white rounded-2xl shadow-md border-2 border-emerald-500/50 overflow-hidden flex flex-col transition-all animate-fade-in">
                {/* Header de Peregrino Identificado */}
                <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs sm:text-sm tracking-tight">
                      {activePosta === 'Parroquia (Micro)' ? 'Presente en Parroquia' : 'Peregrino Identificado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Acreditación Activa
                    </span>
                    <button
                      onClick={() => setSelectedPeregrino(null)}
                      type="button"
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Cerrar y volver a estado de espera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 flex flex-col gap-3.5">
                  {/* Foto y Datos Nominales BÁSICOS: Nombre, Apellido, Edad, Teléfono, ID */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs overflow-hidden">
                        <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight truncate">
                        {selectedPeregrino.nombre} {selectedPeregrino.apellido}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-xs text-slate-800 border border-slate-200">
                          {selectedPeregrino.idCorto}
                        </span>
                        {selectedPeregrino.edad && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 font-bold text-xs text-amber-800 border border-amber-200">
                            {selectedPeregrino.edad} años
                          </span>
                        )}
                        {selectedPeregrino.dni && (
                          <span className="text-xs text-slate-600 font-mono font-semibold">
                            DNI: {selectedPeregrino.dni}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <a 
                          href={`tel:${selectedPeregrino.telefono.replace(/[^0-9]/g, '')}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-700 font-mono font-bold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-200 transition"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{selectedPeregrino.telefono}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Última Referencia de Puesto */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="uppercase font-bold tracking-wider text-[9px]">Última Referencia</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                        En Tiempo Esperado
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium pt-0.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">
                        {selectedPeregrino.estadoActual === 'CAMINANDO' ? 'Caminando' : selectedPeregrino.estadoActual === 'MOVIL_APOYO' ? 'En Móvil' : 'Retirado'} — Visto por última vez: {selectedPeregrino.ultimaPosta}
                      </span>
                    </div>
                  </div>

                  {/* ACCIÓN NECESARIA: LOS TRES BOTONES DE ACCIÓN (Touch Friendly > 52px) */}
                  <div className="flex flex-col gap-2 mt-0.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Acción necesaria:
                    </span>

                    {/* 1. Confirmar Paso por Puesto de Apoyo / Marcar Presente en Parroquia */}
                    <button
                      onClick={() => handleAction('CAMINANDO', activePosta === 'Parroquia (Micro)' ? 'Presente en Parroquia / Subió al Micro' : `Confirmado en Puesto ${activePosta}`)}
                      disabled={isProcessing}
                      type="button"
                      className="w-full min-h-[52px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white flex items-center justify-between shadow-xs transition disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-xs sm:text-sm leading-tight">
                            {activePosta === 'Parroquia (Micro)' ? 'Marcar Presente (Sube al Micro)' : 'Confirmar Paso por Puesto'}
                          </span>
                          <span className="text-[11px] text-emerald-100 leading-none">
                            {activePosta === 'Parroquia (Micro)' ? 'Acreditado para salida hacia Liniers' : `Registrar en Puesto ${activePosta} (Km ${puestoConfig.km})`}
                          </span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </button>

                    {/* 2. Subió a Móvil de Apoyo (Amarillo / Naranja) */}
                    <button
                      onClick={() => handleAction('MOVIL_APOYO', `Subió a Móvil en ${activePosta}`)}
                      disabled={isProcessing}
                      type="button"
                      className="w-full min-h-[52px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 flex items-center justify-between shadow-xs transition disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center">
                          <Bus className="w-5 h-5 text-slate-950" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-xs sm:text-sm leading-tight">Subió a Móvil de Apoyo</span>
                          <span className="text-[11px] text-amber-950/80 leading-none">
                            Traslado a puesto técnico
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-950" />
                    </button>

                    {/* 3. Retirado / Abandono / Ausente (Rojo) */}
                    <button
                      onClick={() => handleAction('BAJA', activePosta === 'Parroquia (Micro)' ? 'Ausente en Parroquia' : `Retirado en Puesto ${activePosta}`)}
                      disabled={isProcessing}
                      type="button"
                      className="w-full min-h-[52px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white flex items-center justify-between shadow-xs transition disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                          <UserX className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-xs sm:text-sm leading-tight">
                            {activePosta === 'Parroquia (Micro)' ? 'Ausente / No Viaja' : 'Retirado / Abandono'}
                          </span>
                          <span className="text-[11px] text-rose-100 leading-none">
                            {activePosta === 'Parroquia (Micro)' ? 'No asistió a la salida del micro' : 'Fin de marcha por fatiga o derivación'}
                          </span>
                        </div>
                      </div>
                      <UserX className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* CARD DE ESTADO DE ESPERA: AÚN NO SE HAN ESCANEADO DATOS */
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center transition-all animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
                  <ScanLine className="w-7 h-7 text-slate-500 animate-pulse" />
                </div>

                <div className="flex flex-col gap-1 max-w-sm">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                    Aún no se han escaneado datos
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Apunta la cámara al código QR de la credencial o pulsera oficial del peregrino, o selecciónalo mediante la búsqueda manual inferior.
                  </p>
                </div>

                <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Padrón 2026 listo: {peregrinos.length} peregrinos habilitados</span>
                </div>
              </div>
            )}

            {/* 3. Búsqueda Manual (Abajo del todo en la columna de trabajo) */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-700" />
                  <h2 className="font-bold text-sm text-slate-900">Búsqueda Manual</h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  Toma por Nombre
                </span>
              </div>

              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por Apellido, Nombre o ID (#PL-...)..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Coincidencias rápidas sugeridas */}
              <div className="flex flex-col gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {activePosta === 'Parroquia (Micro)' ? 'Peregrinos convocados en la Parroquia:' : 'Peregrinos en tránsito por este tramo:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sugerenciasManuales.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between gap-2 transition"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {p.nombre} {p.apellido}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate font-mono">
                          {p.idCorto} {p.edad ? `• ${p.edad} años` : ''} {p.dni ? `• DNI ${p.dni}` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPeregrino(p);
                          triggerFeedback(`Cargado: ${p.nombre} ${p.apellido} (${p.idCorto})`, 'success');
                        }}
                        type="button"
                        className="h-8 px-2.5 shrink-0 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1 active:scale-95"
                      >
                        <span>Cargar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* COLUMNA 2: Métricas del Puesto Activo (5 cols en desktop) */}
          <section className="lg:col-span-5 flex flex-col gap-3.5">
            {/* MÉTRICAS DEL PUESTO ACTIVO */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  Métricas de Puesto {activePosta}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {isOnline ? 'Sincronizado' : 'Modo Offline'}
                </span>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Registrados
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{metricas.registrados}</span>
                  <span className="text-[10px] text-slate-500">Peregrinos en este puesto</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> En Ruta
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{metricas.pendientes}</span>
                  <span className="text-[10px] text-slate-500">Pendientes de paso</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Caudal de paso proyectado</span>
                  <span className="font-bold text-slate-800">{metricas.porcentaje}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-slate-900 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, Number(metricas.porcentaje)))}%` }}
                  />
                </div>
              </div>

              {/* Historial Local colapsable */}
              <button
                onClick={() => setShowHistory(prev => !prev)}
                type="button"
                className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <History className="w-3.5 h-3.5" />
                <span>{showHistory ? 'Ocultar historial' : 'Ver historial de escaneos locales'}</span>
              </button>

              {showHistory && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto">
                  <span className="text-[9px] uppercase font-bold text-slate-400">
                    Últimos registros en esta terminal ({historialPuesto.length}):
                  </span>
                  {historialPuesto.length > 0 ? (
                    historialPuesto.map((h, i) => (
                      <div
                        key={h.id || i}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {h.estado === 'CAMINANDO' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : h.estado === 'MOVIL_APOYO' ? (
                            <Bus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <UserX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-800 truncate text-[11px]">
                            {h.nombreCompleto} ({h.idCorto})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic py-1">
                      Sin escaneos registrados aún en esta terminal.
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
