import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Peregrino } from '../types';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Users, 
  RefreshCw,
  FileText
} from 'lucide-react';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (nuevosPeregrinos: Peregrino[]) => Promise<void>;
  onResetOriginal: () => Promise<void>;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onResetOriginal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsedPilgrims, setParsedPilgrims] = useState<Peregrino[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [mode, setMode] = useState<'file' | 'paste'>('file');

  if (!isOpen) return null;

  // Parser genérico para filas de Excel/CSV
  const parseRowsToPilgrims = (rows: any[]): Peregrino[] => {
    if (!rows || rows.length === 0) return [];

    return rows.map((row: any, index: number) => {
      // Normalizar claves a minúsculas sin acentos
      const normalizedRow: Record<string, any> = {};
      Object.keys(row).forEach(k => {
        const cleanKey = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        normalizedRow[cleanKey] = row[k];
      });

      // Extraer nombre y apellido (Soporta: 'apellido_nombre', 'apellido y nombre', 'nombre_apellido', etc.)
      let nombre = normalizedRow['nombre'] || normalizedRow['nombres'] || '';
      let apellido = normalizedRow['apellido'] || normalizedRow['apellidos'] || '';

      const combinedFullName = normalizedRow['apellido_nombre'] || 
        normalizedRow['apellido nombre'] || 
        normalizedRow['apellidonombre'] ||
        normalizedRow['apellido y nombre'] ||
        normalizedRow['nombre_apellido'] || 
        normalizedRow['nombre y apellido'] ||
        normalizedRow['peregrino'] ||
        normalizedRow['persona'] ||
        '';

      if ((!nombre || !apellido) && combinedFullName) {
        const fullStr = String(combinedFullName).trim();
        // Si viene "Apellido Nombre" (ej. "Abasolo Maria Eugenia" o "Acosta Leonardo Miguel")
        const parts = fullStr.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
          apellido = parts[0];
          nombre = '';
        } else if (parts.length === 2) {
          // El primero es apellido, el segundo nombre
          apellido = parts[0];
          nombre = parts[1];
        } else if (parts.length >= 3) {
          // Si el primer término es compuesto o primer apellido
          // En listados tipo "Abasolo Maria Eugenia", el 1er token suele ser apellido
          apellido = parts[0];
          nombre = parts.slice(1).join(' ');
        }
      }

      if (!nombre && !apellido) {
        nombre = `Peregrino`;
        apellido = `#${index + 1}`;
      }

      // Extraer Edad
      const edadRaw = normalizedRow['edad'] || normalizedRow['anos'] || normalizedRow['anios'];
      const edad = edadRaw ? parseInt(String(edadRaw).replace(/\D/g, ''), 10) || undefined : undefined;

      // Extraer DNI (opcional)
      const dniVal = normalizedRow['dni'] || 
        normalizedRow['documento'] || 
        normalizedRow['doc'] || 
        '';
      const dni = dniVal ? String(dniVal).trim() : undefined;

      // Extraer Teléfono
      let telefonoRaw = String(
        normalizedRow['telefono'] || 
        normalizedRow['celular'] || 
        normalizedRow['tel'] || 
        normalizedRow['contacto'] || 
        ''
      ).replace(/[^\d+]/g, '').trim();

      if (!telefonoRaw) {
        telefonoRaw = '11 4000-0000';
      } else if (telefonoRaw.startsWith('11') && telefonoRaw.length === 10) {
        telefonoRaw = `11 ${telefonoRaw.slice(2, 6)}-${telefonoRaw.slice(6)}`;
      }
      const telefono = telefonoRaw;

      // Extraer o generar ID
      const numId = index + 1;
      const idRaw = normalizedRow['id'] || normalizedRow['idcorto'] || normalizedRow['numero'] || `PL-${numId.toString().padStart(3, '0')}`;
      const id = String(idRaw).replace('#', '').trim();
      const idCorto = id.startsWith('PL-') ? `#${id}` : `#PL-${numId.toString().padStart(3, '0')}`;

      // Estado inicial
      const estadoRaw = String(normalizedRow['estado'] || '').toUpperCase();
      const estadoActual = (estadoRaw.includes('MOVIL') || estadoRaw.includes('APOYO')) 
        ? 'MOVIL_APOYO' 
        : (estadoRaw.includes('BAJA') || estadoRaw.includes('RETIRO')) 
        ? 'BAJA' 
        : 'CAMINANDO';

      return {
        id,
        idCorto,
        nombre: String(nombre).trim(),
        apellido: String(apellido).trim(),
        dni,
        telefono,
        parroquia: 'Pqa. Nuestra Sra. de Luján Sarandí',
        fotoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%2394a3b8"><rect width="100" height="100" fill="%23f1f5f9"/><circle cx="50" cy="38" r="19" fill="%23cbd5e1"/><path d="M18,88 C18,68 32,58 50,58 C68,58 82,68 82,88 Z" fill="%23cbd5e1"/></svg>`,
        rol: 'PEREGRINO',
        estadoActual,
        ultimaPosta: 'Sin registros',
        ultimoTimestamp: null,
        tomadorUltimoRegistro: undefined,
      };
    });
  };

  // Manejo de carga de archivo .xlsx, .xls o .csv
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          setErrorMsg('El archivo está vacío o no contiene filas con encabezados.');
          return;
        }

        const pilgrims = parseRowsToPilgrims(jsonRows);
        setParsedPilgrims(pilgrims);
      } catch (err: any) {
        console.error('Error leyendo Excel:', err);
        setErrorMsg('Error al procesar el archivo Excel. Verifica que sea un formato válido (.xlsx, .xls o .csv).');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Manejo de texto pegado (ej. copiar y pegar celdas desde Excel directamente)
  const handlePasteProcess = () => {
    setErrorMsg(null);
    if (!pasteText.trim()) {
      setErrorMsg('Pega el texto copiado de tus filas de Excel.');
      return;
    }

    try {
      const workbook = XLSX.read(pasteText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        setErrorMsg('No se detectaron columnas válidas en el texto pegado.');
        return;
      }

      const pilgrims = parseRowsToPilgrims(jsonRows);
      setParsedPilgrims(pilgrims);
      setFileName(`Texto copiado (${pilgrims.length} filas)`);
    } catch (err) {
      setErrorMsg('Error procesando el texto. Asegúrate de incluir la fila de encabezados.');
    }
  };

  // Confirmar la importación hacia Dexie.js
  const handleConfirmImport = async () => {
    if (parsedPilgrims.length === 0) return;
    setIsProcessing(true);
    try {
      await onImportSuccess(parsedPilgrims);
      onClose();
    } catch (e: any) {
      setErrorMsg('Error guardando en la base local: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Descargar plantilla oficial
  const handleDownloadTemplate = () => {
    const templateData = [
      { 'apellido_nombre': 'Abásolo Maria Eugenia', 'telefono': '1141492055', 'edad': 21 },
      { 'apellido_nombre': 'Acosta Leonardo Miguel', 'telefono': '1132529747', 'edad': 44 },
      { 'apellido_nombre': 'Agüero Valdez Gustavo Ariel', 'telefono': '1151193934', 'edad': 27 },
      { 'apellido_nombre': 'Ale Zoe Victoria', 'telefono': '1154560496', 'edad': 26 }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peregrinos');
    XLSX.writeFile(wb, 'Plantilla_Peregrinos_Lujan_2026.xlsx');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Importar Peregrinos desde Excel</h3>
              <p className="text-[10px] text-slate-300">Formatos compatibles: .xlsx, .xls, .csv o copiado directo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto text-xs sm:text-sm text-slate-700">
          {/* Tabs: Subir Archivo vs Pegar Datos */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Archivo (.xlsx / .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Copiar y Pegar celdas</span>
            </button>
          </div>

          {/* Subir archivo */}
          {mode === 'file' ? (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-emerald-600 mb-2 group-hover:scale-105 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 text-xs sm:text-sm">
                  Haz clic aquí para seleccionar tu archivo Excel del cliente
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Reconoce automáticamente columnas como: Nombre, Apellido, DNI, Teléfono
                </p>
                {fileName && (
                  <span className="mt-3 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-xs font-bold">
                    📄 {fileName}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Pegar datos */
            <div className="flex flex-col gap-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Pega aquí las filas copiadas desde Excel (incluyendo la cabecera: Nombre | Apellido | DNI | Teléfono)..."
                rows={4}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handlePasteProcess}
                className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition self-end"
              >
                Procesar Texto
              </button>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vista Previa de Peregrinos Reconocidos */}
          {parsedPilgrims.length > 0 && (
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Peregrinos detectados: <strong>{parsedPilgrims.length}</strong></span>
                </span>
                <span className="text-[10px] text-slate-400">Primeras 4 filas de muestra:</span>
              </div>

              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {parsedPilgrims.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-900 truncate">
                        {p.nombre} {p.apellido}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        DNI: {p.dni} • Tel: {p.telefono}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                      {p.idCorto}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones de acción complementaria */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla Excel</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (window.confirm('¿Deseas restablecer el padrón a los 230 peregrinos de prueba?')) {
                  await onResetOriginal();
                  onClose();
                }
              }}
              className="text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 hover:underline text-[11px]"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restablecer datos originales</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-semibold text-xs transition"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            disabled={parsedPilgrims.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'Importando...' : `Confirmar e Importar (${parsedPilgrims.length})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
