import Dexie, { Table } from 'dexie';
import { Peregrino, RegistroPosta, PostaNombre, EstadoPeregrino } from '../types';
import { getInitialPilgrims } from '../data/initialPilgrims';

export class PeregrinacionDB extends Dexie {
  peregrinos!: Table<Peregrino, string>;
  registrosPostas!: Table<RegistroPosta, number>;

  constructor() {
    super('PeregrinacionLujan2026DB_V2');
    this.version(1).stores({
      peregrinos: 'id, idCorto, estadoActual, ultimaPosta, apellido, nombre, dni',
      registrosPostas: '++id, peregrinoId, idCorto, posta, estado, timestamp, synched',
    });
  }
}

export const db = new PeregrinacionDB();

/**
 * Inicializa la base de datos local con los peregrinos oficiales del Excel del cliente
 */
export async function seedDatabaseIfNeeded(): Promise<Peregrino[]> {
  try {
    const count = await db.peregrinos.count();
    if (count === 0) {
      const initialPilgrims = getInitialPilgrims();
      await db.peregrinos.bulkAdd(initialPilgrims);

      // Crear algunos registros de puestos iniciales para alimentar el historial local
      const initialPasses: RegistroPosta[] = initialPilgrims.slice(0, 35).map((p, idx) => ({
        peregrinoId: p.id,
        idCorto: p.idCorto,
        nombreCompleto: `${p.nombre} ${p.apellido}`,
        posta: p.ultimaPosta as PostaNombre,
        estado: p.estadoActual,
        detalle: p.subEstadoDetalle,
        tomadorId: 'TOMADOR-04-MERLO',
        tomadorNombre: p.tomadorUltimoRegistro || 'Hno. Lucas',
        timestamp: p.ultimoTimestamp || Date.now() - (idx * 3) * 60 * 1000,
        synched: 1, // Ya sincronizados
        syncedAt: Date.now() - 30 * 1000,
      }));

      await db.registrosPostas.bulkAdd(initialPasses);
      return initialPilgrims;
    }
    return await db.peregrinos.toArray();
  } catch (err) {
    console.error('Error inicializando Dexie DB:', err);
    return getInitialPilgrims();
  }
}

/**
 * Registra el paso de un peregrino por una posta (soporta offline de forma nativa)
 */
export async function registrarPasoEnPosta({
  peregrinoId,
  posta,
  estado,
  detalle,
  tomadorNombre = 'Hno. Lucas',
  isOnline = true,
}: {
  peregrinoId: string;
  posta: PostaNombre;
  estado: EstadoPeregrino;
  detalle?: string;
  tomadorNombre?: string;
  isOnline?: boolean;
}): Promise<{ peregrinoActualizado: Peregrino; registro: RegistroPosta }> {
  const peregrino = await db.peregrinos.get(peregrinoId);
  if (!peregrino) {
    throw new Error(`Peregrino con ID ${peregrinoId} no encontrado en la base local.`);
  }

  const now = Date.now();

  // Si está offline o se desea asegurar queue, synched = 0
  const nuevoRegistro: RegistroPosta = {
    peregrinoId: peregrino.id,
    idCorto: peregrino.idCorto,
    nombreCompleto: `${peregrino.nombre} ${peregrino.apellido}`,
    posta,
    estado,
    detalle: detalle || (
      estado === 'CAMINANDO' ? `Paso confirmado por ${posta}` :
      estado === 'MOVIL_APOYO' ? 'Subió a Móvil de Apoyo' : 'Retiro / Abandono de marcha'
    ),
    tomadorId: 'TOMADOR-04-MERLO',
    tomadorNombre,
    timestamp: now,
    synched: isOnline ? 1 : 0,
    syncedAt: isOnline ? now : undefined,
  };

  const registroId = await db.registrosPostas.add(nuevoRegistro);
  nuevoRegistro.id = registroId;

  // Actualizar el estado del peregrino en la tabla local
  const peregrinoActualizado: Peregrino = {
    ...peregrino,
    estadoActual: estado,
    subEstadoDetalle: nuevoRegistro.detalle,
    ultimaPosta: posta,
    ultimoTimestamp: now,
    tomadorUltimoRegistro: tomadorNombre,
  };

  await db.peregrinos.put(peregrinoActualizado);

  return { peregrinoActualizado, registro: nuevoRegistro };
}

/**
 * Obtiene la cantidad de registros locales que están pendientes de subida
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    return await db.registrosPostas.where('synched').equals(0).count();
  } catch (e) {
    return 0;
  }
}

/**
 * Función de sincronización para subir los registros pendientes hacia la nube (Supabase / API)
 */
export async function syncRegistrosConNube(): Promise<{
  success: boolean;
  totalSincronizados: number;
  payloadParaSupabase: any[];
  error?: string;
}> {
  try {
    const pendientes = await db.registrosPostas.where('synched').equals(0).toArray();

    if (pendientes.length === 0) {
      return { success: true, totalSincronizados: 0, payloadParaSupabase: [] };
    }

    // Preparar el payload optimizado según el esquema de Supabase Postgres
    const payloadParaSupabase = pendientes.map(p => ({
      peregrino_id: p.peregrinoId,
      id_corto: p.idCorto,
      nombre_completo: p.nombreCompleto,
      posta: p.posta,
      estado: p.estado,
      detalle: p.detalle,
      tomador_id: p.tomadorId,
      tomador_nombre: p.tomadorNombre,
      recorded_at: new Date(p.timestamp).toISOString(),
      client_sync_timestamp: new Date().toISOString(),
    }));

    // Simular o ejecutar llamada con latencia de red de terreno (Ruta 7)
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Si tuviéramos env de supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY), se haría el POST real:
    // await fetch(`${supabaseUrl}/rest/v1/registros_postas_lujan`, { method: 'POST', body: JSON.stringify(payloadParaSupabase) });

    // Marcar como sincronizados en Dexie
    const now = Date.now();
    await db.transaction('rw', db.registrosPostas, async () => {
      for (const reg of pendientes) {
        if (reg.id) {
          await db.registrosPostas.update(reg.id, {
            synched: 1,
            syncedAt: now,
          });
        }
      }
    });

    return {
      success: true,
      totalSincronizados: pendientes.length,
      payloadParaSupabase,
    };
  } catch (err: any) {
    console.error('Error sincronizando con la nube:', err);
    return {
      success: false,
      totalSincronizados: 0,
      payloadParaSupabase: [],
      error: err.message || 'Error de red en sincronización',
    };
  }
}

/**
 * Reemplaza o importa el padrón completo a partir de un archivo Excel cargado por el usuario
 */
export async function importarPeregrinosDesdeExcel(nuevosPeregrinos: Peregrino[]): Promise<number> {
  await db.transaction('rw', [db.peregrinos, db.registrosPostas], async () => {
    await db.peregrinos.clear();
    await db.registrosPostas.clear();
    await db.peregrinos.bulkAdd(nuevosPeregrinos);
  });
  return nuevosPeregrinos.length;
}

/**
 * Restablece los datos de prueba originales si el usuario desea reiniciar
 */
export async function restablecerPadronOriginal(): Promise<Peregrino[]> {
  const initialPilgrims = getInitialPilgrims();
  await db.transaction('rw', [db.peregrinos, db.registrosPostas], async () => {
    await db.peregrinos.clear();
    await db.registrosPostas.clear();
    await db.peregrinos.bulkAdd(initialPilgrims);
  });
  return initialPilgrims;
}

/**
 * Limpia todos los registros y marcas de paso para comenzar el día del evento en Cero absoluto
 * (Mantiene el padrón de peregrinos pero con estado 'CAMINANDO' y 'Sin registros')
 */
export async function reiniciarPasoEnCero(): Promise<Peregrino[]> {
  const todos = await db.peregrinos.toArray();
  const limpiados: Peregrino[] = todos.map(p => ({
    ...p,
    estadoActual: 'CAMINANDO' as const,
    subEstadoDetalle: 'Listo para iniciar marcha',
    ultimaPosta: 'Sin registros',
    ultimoTimestamp: null,
    tomadorUltimoRegistro: undefined,
  }));

  await db.transaction('rw', [db.peregrinos, db.registrosPostas], async () => {
    await db.registrosPostas.clear();
    await db.peregrinos.clear();
    await db.peregrinos.bulkAdd(limpiados);
  });

  return limpiados;
}

