import React, { useState } from 'react';
import { Peregrino, EstadoPeregrino, PostaNombre } from '../types';
import { POSTAS_INFO } from '../data/initialPilgrims';
import { X, Edit3, Footprints, Bus, UserX, Check } from 'lucide-react';

interface EditStatusModalProps {
  peregrino: Peregrino | null;
  onClose: () => void;
  onSave: (peregrinoId: string, nuevoEstado: EstadoPeregrino, posta: PostaNombre, detalle: string) => Promise<void>;
}

export const EditStatusModal: React.FC<EditStatusModalProps> = ({
  peregrino,
  onClose,
  onSave,
}) => {
  if (!peregrino) return null;

  const [estado, setEstado] = useState<EstadoPeregrino>(peregrino.estadoActual);
  const [posta, setPosta] = useState<PostaNombre>(
    (peregrino.ultimaPosta !== 'Sin registros' ? peregrino.ultimaPosta : 'La Reja') as PostaNombre
  );
  const [detalle, setDetalle] = useState(peregrino.subEstadoDetalle || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(peregrino.id, estado, posta, detalle);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-300" />
            <h3 className="font-bold text-sm sm:text-base">Modificar Estado</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5 text-xs sm:text-sm text-slate-700">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-tight">
                {peregrino.nombre} {peregrino.apellido}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {peregrino.idCorto} • DNI: {peregrino.dni}
              </p>
            </div>
          </div>

          {/* Selector de Estado */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Estado:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEstado('CAMINANDO');
                  if (!detalle) setDetalle('Caminando a buen ritmo');
                }}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                  estado === 'CAMINANDO'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Footprints className="w-4 h-4 text-emerald-600" />
                <span>Caminando</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEstado('MOVIL_APOYO');
                  if (!detalle) setDetalle('Móvil de auxilio temporal');
                }}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                  estado === 'MOVIL_APOYO'
                    ? 'bg-amber-50 text-amber-800 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Bus className="w-4 h-4 text-amber-500" />
                <span>En Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEstado('BAJA');
                  if (!detalle) setDetalle('Retiro / Baja asistida');
                }}
                className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                  estado === 'BAJA'
                    ? 'bg-rose-50 text-rose-700 border-rose-500 ring-2 ring-rose-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserX className="w-4 h-4 text-rose-600" />
                <span>Baja</span>
              </button>
            </div>
          </div>

          {/* Puesto de Apoyo Asociado */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Puesto de Apoyo Asociado:
            </label>
            <select
              value={posta}
              onChange={(e) => setPosta(e.target.value as PostaNombre)}
              className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {POSTAS_INFO.map(p => (
                <option key={p.id} value={p.nombre}>
                  Puesto {p.nombre} (Km {p.km})
                </option>
              ))}
            </select>
          </div>

          {/* Detalle o novedad */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Detalle / Motivo:
            </label>
            <input
              type="text"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Ej: Paso verificado por teléfono..."
              className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Actualizar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
