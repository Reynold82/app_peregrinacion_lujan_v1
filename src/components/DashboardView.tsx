import React, { useState, useMemo } from 'react';
import { Peregrino, RegistroPosta, PostaNombre, EstadoPeregrino } from '../types';
import { POSTAS_INFO } from '../data/initialPilgrims';
import { EditStatusModal } from './EditStatusModal';
import { ImportExcelModal } from './ImportExcelModal';
import { 
  Users, 
  Footprints, 
  Bus, 
  UserX, 
  Search, 
  Download, 
  Upload,
  FileSpreadsheet,
  RefreshCw, 
  MapPin, 
  Phone, 
  Edit3, 
  Navigation,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';

interface DashboardViewProps {
  peregrinos: Peregrino[];
  registrosPostas: RegistroPosta[];
  onRefresh: () => Promise<void>;
  isSyncing: boolean;
  onUpdatePeregrinoEstado: (
    peregrinoId: string, 
    estado: EstadoPeregrino, 
    posta: PostaNombre, 
    detalle: string
  ) => Promise<void>;
  onImportExcel: (nuevosPeregrinos: Peregrino[]) => Promise<void>;
  onResetOriginal: () => Promise<void>;
  onResetToZero: () => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  peregrinos,
  registrosPostas,
  onRefresh,
  isSyncing,
  onUpdatePeregrinoEstado,
  onImportExcel,
  onResetOriginal,
  onResetToZero,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosta, setSelectedPosta] = useState<string>('TODAS');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Modals state
  const [editStatusPeregrino, setEditStatusPeregrino] = useState<Peregrino | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // 1. Métricas globales
  const stats = useMemo(() => {
    const total = peregrinos.length;
    const caminando = peregrinos.filter(p => p.estadoActual === 'CAMINANDO').length;
    const movil = peregrinos.filter(p => p.estadoActual === 'MOVIL_APOYO').length;
    const bajas = peregrinos.filter(p => p.estadoActual === 'BAJA').length;

    const walkingPct = total > 0 ? ((caminando / total) * 100).toFixed(1) : '0';
    const movilPct = total > 0 ? ((movil / total) * 100).toFixed(1) : '0';
    const bajasPct = total > 0 ? ((bajas / total) * 100).toFixed(1) : '0';

    return { total, caminando, movil, bajas, walkingPct, movilPct, bajasPct };
  }, [peregrinos]);

  // 2. Conteo por Puesto de Apoyo
  const densidadPuestos = useMemo(() => {
    const counts: Record<string, number> = {
      'Parroquia (Micro)': 0,
      'Morón': 0,
      'Merlo': 0,
      'La Reja': 0,
      'Gral. Rodríguez': 0,
      '1er. Puente': 0,
      'Luján (Santuario)': 0,
    };

    peregrinos.forEach(p => {
      if (counts[p.ultimaPosta] !== undefined) {
        counts[p.ultimaPosta]++;
      }
    });

    return counts;
  }, [peregrinos]);

  // 3. Filtrado
  const filteredPilgrims = useMemo(() => {
    return peregrinos.filter(p => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        `${p.nombre} ${p.apellido} ${p.idCorto} ${p.dni} ${p.parroquia}`.toLowerCase().includes(query);

      const matchesPosta = selectedPosta === 'TODAS' || p.ultimaPosta === selectedPosta;
      const matchesEstado = selectedEstado === 'TODOS' || p.estadoActual === selectedEstado;

      return matchesSearch && matchesPosta && matchesEstado;
    });
  }, [peregrinos, searchTerm, selectedPosta, selectedEstado]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPosta, selectedEstado]);

  const totalPages = Math.max(1, Math.ceil(filteredPilgrims.length / itemsPerPage));
  const paginatedPilgrims = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPilgrims.slice(start, start + itemsPerPage);
  }, [filteredPilgrims, currentPage, itemsPerPage]);

  // 4. Exportar CSV
  const handleExportCSV = () => {
    const headers = [
      'ID,Nombre,Apellido,Edad,DNI,Telefono,Estado,Detalle,Ultimo Puesto,Ultimo Registro,Tomador'
    ];

    const rows = peregrinos.map(p => [
      `"${p.idCorto}"`,
      `"${p.nombre}"`,
      `"${p.apellido}"`,
      `"${p.edad || ''}"`,
      `"${p.dni || ''}"`,
      `"${p.telefono}"`,
      `"${p.estadoActual}"`,
      `"${p.subEstadoDetalle || ''}"`,
      `"${p.ultimaPosta}"`,
      `"${p.ultimoTimestamp ? new Date(p.ultimoTimestamp).toLocaleString() : ''}"`,
      `"${p.tomadorUltimoRegistro || ''}"`,
    ].join(','));

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Peregrinacion_Lujan_2026_Reporte_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full pb-20">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 flex flex-col gap-4 sm:gap-6">
        
        {/* 1. BARRA DE CONTROL SUPERIOR */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-extrabold">
                Tablero Central
              </span>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  Sincronización: <strong className="text-slate-800 font-bold">{isSyncing ? 'Actualizando...' : 'al día'}</strong>
                </span>
              </div>
            </div>
            <h1 className="font-extrabold text-lg sm:text-2xl text-slate-900 tracking-tight leading-tight mt-0.5">
              Monitoreo y Control General de Peregrinos
            </h1>
            <p className="text-xs text-slate-500">
              Supervisión de {stats.total} peregrinos en ruta directa hacia la Basílica de Luján.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={async () => {
                if (window.confirm('⚠️ ¿Deseas limpiar todos los registros y comenzar la app en CERO absoluto para el día del evento?\n\n- Se mantendrán todos los 243 peregrinos intactos.\n- Se borrarán los escaneos de prueba en la nube y en todos los celulares.\n- Todos los estados volverán a "Listo para iniciar marcha" sin registros de puesto.')) {
                  await onResetToZero();
                }
              }}
              className="h-10 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
              title="Borra todos los escaneos de prueba de hoy y deja el padrón limpio para el día del evento"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Reiniciar Pruebas (Poner a Cero)</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-700'}`} />
              <span>{isSyncing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
              title="Cargar archivo Excel (.xlsx, .csv) de peregrinos registrados"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Importar Excel / CSV</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Exportar Reporte (CSV)</span>
            </button>
          </div>
        </div>

        {/* 2. TARJETAS DE RESUMEN RÁPIDO (KPI CARDS 4 COLUMNAS) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Censo Total */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
            <div className="w-1.5 h-full absolute left-0 top-0 bg-slate-900" />
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Censo Total</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{stats.total}</span>
              </div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 pt-1">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-900 h-full rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Padrón 100% verificado
              </span>
            </div>
          </div>

          {/* Caminando en Ruta (Verde) */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
            <div className="w-1.5 h-full absolute left-0 top-0 bg-emerald-600" />
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Caminando</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">{stats.caminando}</span>
              </div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 pt-1">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${stats.walkingPct}%` }} />
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                {stats.walkingPct}% en marcha activa
              </span>
            </div>
          </div>

          {/* En Móviles de Apoyo (Amarillo / Naranja) */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
            <div className="w-1.5 h-full absolute left-0 top-0 bg-amber-500" />
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Móvil Apoyo</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-0.5">{stats.movil}</span>
              </div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 pt-1">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${stats.movilPct}%` }} />
              </div>
              <span className="text-[10px] text-amber-800 font-bold mt-1 block">
                {stats.movilPct}% en combis
              </span>
            </div>
          </div>

          {/* Retirados / Bajas (Rojo) */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200 relative overflow-hidden flex flex-col justify-between">
            <div className="w-1.5 h-full absolute left-0 top-0 bg-rose-600" />
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bajas</span>
                <span className="text-2xl sm:text-3xl font-black text-rose-600 mt-0.5">{stats.bajas}</span>
              </div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2.5 pt-1">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-600 h-full rounded-full" style={{ width: `${stats.bajasPct}%` }} />
              </div>
              <span className="text-[10px] text-rose-700 font-bold mt-1 block">
                {stats.bajasPct}% retirados
              </span>
            </div>
          </div>
        </div>

        {/* 3. FLUJO Y DENSIDAD POR PUESTO DE APOYO */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Topología de la Marcha
              </span>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">
                Flujo y Densidad por Puesto de Apoyo
              </h2>
            </div>
            <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 self-start sm:self-auto font-medium">
              <Navigation className="w-3 h-3 text-slate-500" />
              Ruta 7 • Km 0 a Km 68
            </span>
          </div>

          {/* Segmented Density Bar */}
          <div className="w-full flex flex-col gap-1.5 pt-0.5">
            <div className="w-full h-7 bg-slate-100 rounded-lg p-0.5 flex gap-1 overflow-hidden">
              <div 
                className="h-full rounded bg-slate-200 flex items-center justify-center transition-all duration-500" 
                style={{ width: `${Math.max(10, (densidadPuestos['Merlo'] / stats.total) * 100)}%` }}
              >
                <span className="text-[10px] font-bold text-slate-700 truncate px-1">
                  Merlo ({densidadPuestos['Merlo']})
                </span>
              </div>

              <div 
                className="h-full rounded bg-slate-900 text-white flex items-center justify-center transition-all duration-500" 
                style={{ width: `${Math.max(25, (densidadPuestos['La Reja'] / stats.total) * 100)}%` }}
              >
                <span className="text-[10px] font-bold text-white truncate px-1">
                  La Reja ({densidadPuestos['La Reja']})
                </span>
              </div>

              <div 
                className="h-full rounded bg-slate-300 flex items-center justify-center transition-all duration-500" 
                style={{ width: `${Math.max(15, (densidadPuestos['Gral. Rodríguez'] / stats.total) * 100)}%` }}
              >
                <span className="text-[10px] font-bold text-slate-800 truncate px-1">
                  Gral. Rodríguez ({densidadPuestos['Gral. Rodríguez']})
                </span>
              </div>

              <div 
                className="h-full rounded bg-amber-200 flex items-center justify-center transition-all duration-500" 
                style={{ width: `${Math.max(12, ((stats.movil + stats.bajas) / stats.total) * 100)}%` }}
              >
                <span className="text-[10px] font-bold text-amber-900 truncate px-1">
                  Móviles/Bajas ({stats.movil + stats.bajas})
                </span>
              </div>
            </div>

            {/* Tarjetas de Puestos de Apoyo (Clickeables para filtrar) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 pt-1.5">
              {POSTAS_INFO.map((puesto) => {
                const count = densidadPuestos[puesto.nombre] || 0;
                const isSelected = selectedPosta === puesto.nombre;
                const isEpicentro = puesto.estado === 'Epicentro';

                return (
                  <button
                    key={puesto.id}
                    onClick={() => setSelectedPosta(isSelected ? 'TODAS' : puesto.nombre)}
                    className={`p-2.5 rounded-xl flex flex-col text-left transition border ${
                      isEpicentro
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/20'
                        : isSelected
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold ${isEpicentro ? 'text-amber-300' : 'text-slate-500'}`}>
                        KM {puesto.km}
                      </span>
                      <span className={`text-[8px] px-1 py-0.5 rounded font-black uppercase ${
                        isEpicentro ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {puesto.estado}
                      </span>
                    </div>

                    <span className={`text-xs font-bold mt-0.5 truncate ${isEpicentro ? 'text-white' : 'text-slate-900'}`}>
                      {puesto.nombre}
                    </span>

                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-base font-black ${isEpicentro ? 'text-white' : 'text-slate-900'}`}>
                        {count}
                      </span>
                      <span className={`text-[9px] ${isEpicentro ? 'text-slate-300' : 'text-slate-400'}`}>pax</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. TABLA Y DIRECTORIO MAESTRO FILTRABLE */}
        <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col overflow-hidden">
          {/* Filtros */}
          <div className="p-3.5 sm:p-4 flex flex-col gap-3 border-b border-slate-100">
            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedEstado('TODOS')}
                className={`h-9 px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition ${
                  selectedEstado === 'TODOS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Todos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  selectedEstado === 'TODOS' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-800'
                }`}>
                  {stats.total}
                </span>
              </button>

              <button
                onClick={() => setSelectedEstado('CAMINANDO')}
                className={`h-9 px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition ${
                  selectedEstado === 'CAMINANDO'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Caminando</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  selectedEstado === 'CAMINANDO' ? 'bg-white text-emerald-800' : 'bg-slate-200 text-slate-800'
                }`}>
                  {stats.caminando}
                </span>
              </button>

              <button
                onClick={() => setSelectedEstado('MOVIL_APOYO')}
                className={`h-9 px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition ${
                  selectedEstado === 'MOVIL_APOYO'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>Móvil de Apoyo</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  selectedEstado === 'MOVIL_APOYO' ? 'bg-white text-slate-950' : 'bg-slate-200 text-slate-800'
                }`}>
                  {stats.movil}
                </span>
              </button>

              <button
                onClick={() => setSelectedEstado('BAJA')}
                className={`h-9 px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition ${
                  selectedEstado === 'BAJA'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Baja</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  selectedEstado === 'BAJA' ? 'bg-white text-rose-800' : 'bg-slate-200 text-slate-800'
                }`}>
                  {stats.bajas}
                </span>
              </button>
            </div>

            {/* Buscador y Selector de Puesto de Apoyo */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-8 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por Nombre, DNI o ID (#PL-045)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="md:col-span-4 relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedPosta}
                  onChange={(e) => setSelectedPosta(e.target.value)}
                  className="w-full h-10 pl-9 pr-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="TODAS">Todos los Puestos de Apoyo (1 a 6)</option>
                  {POSTAS_INFO.map(p => (
                    <option key={p.id} value={p.nombre}>
                      Puesto {p.nombre} (Km {p.km})
                    </option>
                  ))}
                  <option value="Sin registros">Sin registros aún</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Peregrinos Responsive */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Peregrino / Contacto</th>
                  <th className="py-2.5 px-3">Edad / DNI</th>
                  <th className="py-2.5 px-3">Estado Actual</th>
                  <th className="py-2.5 px-3">Último Puesto & Hora</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedPilgrims.length > 0 ? (
                  paginatedPilgrims.map((p) => {
                    const initials = `${p.nombre[0] || ''}${p.apellido[0] || ''}`;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        {/* ID */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {p.idCorto}
                          </span>
                        </td>

                        {/* Peregrino / Contacto */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                                {p.nombre} {p.apellido}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Tel: {p.telefono}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Edad / DNI */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600">
                          <div className="flex flex-col">
                            {p.edad ? <span className="font-bold text-slate-800">{p.edad} años</span> : null}
                            {p.dni ? <span className="text-[10px] text-slate-400">DNI: {p.dni}</span> : (!p.edad ? <span className="text-slate-400">-</span> : null)}
                          </div>
                        </td>

                        {/* Estado Actual */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {p.estadoActual === 'CAMINANDO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              En Ruta
                            </span>
                          )}
                          {p.estadoActual === 'MOVIL_APOYO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Móvil Apoyo
                            </span>
                          )}
                          {p.estadoActual === 'BAJA' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Baja
                            </span>
                          )}
                        </td>

                        {/* Último Puesto & Hora */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-800">
                              {p.ultimaPosta !== 'Sin registros' ? `Puesto ${p.ultimaPosta}` : 'Sin registros'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {p.ultimoTimestamp 
                                ? new Date(p.ultimoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs'
                                : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditStatusPeregrino(p)}
                              title="Cambiar Estado Manualmente"
                              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center transition active:scale-95"
                            >
                              <Edit3 className="w-4 h-4 text-blue-600" />
                            </button>

                            <a
                              href={`tel:${p.telefono.replace(/[^0-9]/g, '')}`}
                              title="Llamar a Peregrino"
                              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center transition active:scale-95"
                            >
                              <Phone className="w-4 h-4 text-emerald-600" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                      No se encontraron peregrinos que coincidan con la búsqueda o filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
            <span>
              Mostrando <strong className="text-slate-900 font-bold">{Math.min(filteredPilgrims.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredPilgrims.length, currentPage * itemsPerPage)}</strong> de <strong className="text-slate-900 font-bold">{filteredPilgrims.length}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold flex items-center gap-1 text-[11px] disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="text-xs font-bold text-slate-800 px-2">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold flex items-center gap-1 text-[11px] disabled:opacity-40"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Modificar Estado */}
      <EditStatusModal
        peregrino={editStatusPeregrino}
        onClose={() => setEditStatusPeregrino(null)}
        onSave={onUpdatePeregrinoEstado}
      />

      {/* Modal Importar Excel / CSV */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={onImportExcel}
        onResetOriginal={onResetOriginal}
      />
    </div>
  );
};
