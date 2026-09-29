import React from 'react';
import { Peregrino } from '../types';
import { X, HeartPulse, AlertTriangle, Pill, Phone, User, ShieldCheck } from 'lucide-react';

interface MedicalModalProps {
  peregrino: Peregrino | null;
  onClose: () => void;
}

export const MedicalModal: React.FC<MedicalModalProps> = ({ peregrino, onClose }) => {
  if (!peregrino) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-rose-600 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-200" />
            <h3 className="font-bold text-base">Ficha Médica y Sanitaria Oficial</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-rose-700 text-rose-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-sm text-slate-700 max-h-[80vh] overflow-y-auto">
          {/* Identity summary */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <img
              src={peregrino.fotoUrl}
              alt={peregrino.nombre}
              className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base text-slate-900 leading-tight">
                {peregrino.nombre} {peregrino.apellido}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {peregrino.idCorto} • DNI: {peregrino.dni}
              </span>
              <span className="text-xs text-slate-500 truncate">
                {peregrino.parroquia} ({peregrino.comunidad})
              </span>
            </div>
          </div>

          {/* Blood Factor Highlight */}
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-bold">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
              <span>Grupo y Factor Sanguíneo:</span>
            </div>
            <span className="text-base font-black px-3 py-1 rounded-lg bg-rose-600 text-white shadow-xs">
              {peregrino.factorSanguineo}
            </span>
          </div>

          {/* Allergies */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Alergias Conocidas</span>
            </div>
            <p className="text-slate-900 font-semibold">{peregrino.alergias || 'Ninguna alergia informada'}</p>
          </div>

          {/* Medications */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Pill className="w-4 h-4 text-blue-500" />
              <span>Medicación Habitual</span>
            </div>
            <p className="text-slate-900 font-medium">{peregrino.medicacion || 'Ninguna medicación habitual'}</p>
          </div>

          {/* Observations */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Observaciones de Salud / Ruta
            </span>
            <p className="text-slate-700">{peregrino.observacionesMedicas}</p>
          </div>

          {/* Emergency SOS Contact */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <User className="w-4 h-4 text-amber-700" />
              <span>Contacto Directo de Emergencia (SOS)</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{peregrino.contactoEmergenciaNombre}</p>
                <p className="text-xs text-slate-500">Vínculo: {peregrino.contactoEmergenciaParentesco}</p>
              </div>
              <a
                href={`tel:${(peregrino.contactoEmergenciaTelefono || '').replace(/[^0-9]/g, '')}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Llamar SOS</span>
              </a>
            </div>
            <span className="text-xs font-mono font-bold text-amber-950">
              Tel: {peregrino.contactoEmergenciaTelefono || 'No informado'}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-2">
            Frecuencia Sanitaria Operativa UHF: 440.125 • Móvil de Apoyo Luján
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
