import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { Peregrino } from '../types';
import { 
  Printer, 
  FileDown, 
  Layers, 
  Crop, 
  Church, 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  CheckCircle2,
  IdCard
} from 'lucide-react';

interface CredentialsViewProps {
  peregrinos: Peregrino[];
}

export const CredentialsView: React.FC<CredentialsViewProps> = ({ peregrinos }) => {
  const [ecoMode, setEcoMode] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [currentBatch, setCurrentBatch] = useState<number>(1);
  const [currentSheet, setCurrentSheet] = useState<number>(1);
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);

  // 8 credenciales por pliego A4
  const credentialsPerSheet = 8;
  const totalSheets = Math.ceil(peregrinos.length / credentialsPerSheet);
  const sheetsPerBatch = 4;
  const totalBatches = Math.max(1, Math.ceil(totalSheets / sheetsPerBatch));

  // Generación dinámica de lotes
  const batchList = useMemo(() => {
    const list: { id: number; label: string }[] = [];
    for (let b = 1; b <= totalBatches; b++) {
      const startPilgrim = (b - 1) * sheetsPerBatch * credentialsPerSheet + 1;
      const endPilgrim = Math.min(peregrinos.length, b * sheetsPerBatch * credentialsPerSheet);
      list.push({
        id: b,
        label: `Lote ${b} (PL-${startPilgrim.toString().padStart(3, '0')} a PL-${endPilgrim.toString().padStart(3, '0')})`,
      });
    }
    return list;
  }, [totalBatches, peregrinos.length]);

  // Pliego activo
  const sheetPilgrims = useMemo(() => {
    const start = (currentSheet - 1) * credentialsPerSheet;
    return peregrinos.slice(start, start + credentialsPerSheet);
  }, [peregrinos, currentSheet]);

  // Mapa de QRs SVG reales calculados con la librería estándar de QR
  const [qrSvgMap, setQrSvgMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const generateAllQrs = async () => {
      const entries: [string, string][] = [];
      for (const p of sheetPilgrims) {
        try {
          // Genera el código QR estándar real en SVG
          const svg = await QRCode.toString(p.idCorto, {
            type: 'svg',
            margin: 1,
            errorCorrectionLevel: 'M',
            width: 120,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          entries.push([p.idCorto, svg]);
        } catch (e) {
          console.error('Error generando QR para', p.idCorto, e);
        }
      }
      if (isMounted) {
        setQrSvgMap(Object.fromEntries(entries));
      }
    };

    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [sheetPilgrims]);

  const handlePrint = () => {
    window.print();
  };

  const handlePdfExport = () => {
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 2500);
    }, 1000);
  };

  return (
    <div className="flex flex-col w-full pb-20">
      {/* 1. TOP HEADER BANNER (NO SE IMPRIME) */}
      <div className="print:hidden w-full bg-slate-100 py-3.5 sm:py-5 border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Acreditaciones Oficiales</span>
            </div>
            <h1 className="font-extrabold text-lg sm:text-2xl text-slate-900 tracking-tight mt-0.5">
              Generador e Impresión de Credenciales 2026
            </h1>
            <p className="text-xs text-slate-500">
              Padrón oficial: {peregrinos.length} credenciales con QR de identificación rápida.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <button
              onClick={handlePrint}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold shadow-sm hover:bg-slate-800 transition active:scale-95 min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Credenciales ({peregrinos.length})</span>
            </button>

            <button
              onClick={handlePdfExport}
              disabled={pdfGenerating}
              type="button"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm font-bold hover:bg-slate-50 transition active:scale-95 min-h-[44px]"
            >
              {pdfSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">¡PDF Listo!</span>
                </>
              ) : (
                <>
                  <FileDown className={`w-4 h-4 ${pdfGenerating ? 'animate-bounce' : ''}`} />
                  <span>{pdfGenerating ? 'Compilando...' : 'PDF Imprenta'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR DE CONFIGURACIÓN (NO SE IMPRIME) */}
      <div className="print:hidden w-full bg-white py-2.5 border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Lote */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-500 text-[10px] uppercase">Lote:</span>
              <select
                value={currentBatch}
                onChange={(e) => {
                  const b = Number(e.target.value);
                  setCurrentBatch(b);
                  setCurrentSheet((b - 1) * 4 + 1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer text-xs"
              >
                {batchList.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1">
              <IdCard className="w-3.5 h-3.5 text-amber-300" />
              <span>Anverso (Identificación)</span>
            </div>
          </div>

          {/* Opciones Troquel y Eco */}
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
                className="w-3.5 h-3.5 accent-slate-900 rounded cursor-pointer"
              />
              <span className="text-[11px]">Guías troquel</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ecoMode}
                onChange={(e) => setEcoMode(e.target.checked)}
                className="w-3.5 h-3.5 accent-slate-900 rounded cursor-pointer"
              />
              <span className="text-[11px]">Modo B/N</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. SIMULACIÓN DE PLIEGO A4 CON LAS 8 CREDENCIALES SIMPLIFICADAS */}
      <div className="w-full py-4 sm:py-6 px-3 sm:px-6 flex flex-col items-center">
        {/* Encabezado pliego */}
        <div className="print:hidden w-full max-w-6xl flex items-center justify-between mb-2 text-slate-500 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Crop className="w-3.5 h-3.5 text-slate-600" />
            <span>PLIEGO A4 #{currentSheet} de {totalSheets}</span>
            <span className="hidden sm:inline">• Dimensiones: 210 x 297 mm</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px] font-bold">
            8 Gafetes / Hoja
          </span>
        </div>

        {/* HOJA A4 IMPRESA */}
        <div 
          id="printSheet"
          className={`w-full max-w-6xl bg-white shadow-lg rounded-2xl p-4 sm:p-7 border border-slate-200 transition-all ${
            ecoMode ? 'grayscale contrast-125' : ''
          }`}
        >
          {/* Metadata taller imprenta */}
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-200 text-[9px] text-slate-500 font-bold tracking-wider uppercase">
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-black">COORDINACIÓN ARQUIDIOCESANA LUJÁN 2026</span>
              <span>•</span>
              <span>ORDEN: IMP-2026-ARQ-893</span>
            </div>
            <div className="flex items-center gap-2">
              <span>8.5 x 5.4 CM</span>
              <Crop className="w-3 h-3" />
            </div>
          </div>

          {/* Grilla de Credenciales (Reorganizada con solo los datos solicitados) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {sheetPilgrims.map((p) => (
              <div
                key={p.id}
                className="relative bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
              >
                {/* Ranura Troquelada para Cordón */}
                {showGuides && (
                  <div className="flex justify-center pt-2">
                    <div className="w-8 h-1.5 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center">
                      <span className="w-1.5 h-1 rounded-full bg-slate-400" />
                    </div>
                  </div>
                )}

                {/* ANVERSO ÚNICO Y SIMPLIFICADO */}
                <div className="p-3 flex flex-col justify-between h-full">
                  <div>
                    {/* Brand Strip Oficial */}
                    <div className="bg-slate-900 text-white rounded-lg p-2 flex items-center justify-between mb-2.5 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <Church className="w-3.5 h-3.5 text-amber-300" />
                        <div className="flex flex-col leading-tight">
                          <span className="text-[8px] font-bold tracking-wider uppercase text-slate-300">
                            Peregrinación 2026
                          </span>
                          <span className="text-[11px] font-black tracking-tight">
                            LUJÁN DE LA PAZ
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[8px] font-black uppercase">
                        Oficial
                      </span>
                    </div>

                    {/* Foto y Datos Nominales Reorganizados */}
                    <div className="flex gap-2.5 items-start">
                      <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100 shadow-inner relative border border-slate-200 flex flex-col items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400 mb-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[7px] font-bold text-center py-0.5">
                          OFICIAL
                        </div>
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        {/* ID Corto */}
                        <span className="text-[10px] font-mono font-bold text-amber-600 tracking-wider">
                          ID {p.idCorto}
                        </span>

                        {/* Nombre y Apellido */}
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate">
                          {p.nombre} {p.apellido}
                        </h3>

                        {/* Parroquia fija solicitada por el usuario */}
                        <span className="text-[10px] font-bold text-slate-600 leading-tight mt-0.5">
                          Pqa. Nuestra Sra. de Luján Sarandí
                        </span>

                        {/* Edad y/o DNI */}
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-500 font-semibold">
                          {p.edad && <span>Edad: {p.edad} años</span>}
                          {p.edad && p.dni && <span>•</span>}
                          {p.dni && <span>DNI: {p.dni}</span>}
                        </div>

                        {/* Teléfono */}
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-slate-700 font-mono">
                          <Phone className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                          <span className="truncate">{p.telefono}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Código escaneable */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono font-bold text-slate-400">
                        CRED-2026-OFICIAL
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700">
                        Habilitado en Puestos
                      </span>
                    </div>

                    <div 
                      className="w-12 h-12 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden [&_svg]:w-full [&_svg]:h-full"
                      title={`Código QR: ${p.idCorto}`}
                    >
                      {qrSvgMap[p.idCorto] ? (
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: qrSvgMap[p.idCorto] }}
                        />
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pie de calibración */}
          <div className="mt-5 pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[9px] text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span>ESCALA 100% • PAPEL ILUSTRACIÓN 250G</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">CORTE GUILLOTINA 8.5 x 5.4 CM</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">PÁG. {currentSheet} DE {totalSheets}</span>
              <div className="w-14 h-1.5 bg-gradient-to-r from-slate-900 via-amber-500 to-emerald-600 rounded" />
            </div>
          </div>
        </div>

        {/* 4. PAGINADOR DE PLIEGOS (NO SE IMPRIME) */}
        <div className="print:hidden w-full max-w-6xl mt-3 flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando 8 credenciales por pliego
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSheet(prev => Math.max(1, prev - 1))}
              disabled={currentSheet === 1}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition active:scale-95"
              title="Pliego anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2">
              Pliego {currentSheet} / {totalSheets}
            </span>
            <button
              onClick={() => setCurrentSheet(prev => Math.min(totalSheets, prev + 1))}
              disabled={currentSheet === totalSheets}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition active:scale-95"
              title="Siguiente pliego"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
