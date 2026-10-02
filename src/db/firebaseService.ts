import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  doc, 
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Peregrino, RegistroPosta, PostaNombre, EstadoPeregrino } from '../types';
import { getInitialPilgrims } from '../data/initialPilgrims';

// Inicializar la aplicación Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicializar Firestore con la base de datos específica provisionada
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Habilitar persistencia offline nativa de Firestore para que funcione en la Ruta 7 sin señal
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(firestoreDb).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Múltiples pestañas abiertas, persistencia en una pestaña.');
    } else if (err.code === 'unimplemented') {
      console.warn('El navegador no soporta persistencia offline.');
    }
  });
}

// Probar conexión básica
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestoreDb, '_health', 'status'));
    return true;
  } catch (err) {
    console.log('Verificación Firestore conectividad inicial');
    return false;
  }
}

/**
 * Suscripción en TIEMPO REAL a los 243 peregrinos para todos los 14 colaboradores a la vez
 */
export function subscribeToPeregrinos(
  onData: (peregrinos: Peregrino[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(firestoreDb, 'peregrinos');
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty) {
      onData([]);
      return;
    }
    const list: Peregrino[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Peregrino);
    });
    // Ordenar naturalmente por ID PL-001...
    list.sort((a, b) => a.id.localeCompare(b.id));
    onData(list);
  }, (err) => {
    console.error('Error escuchando peregrinos en tiempo real:', err);
    if (onError) onError(err);
  });
}

/**
 * Suscripción en TIEMPO REAL al historial de pasos de todas las postas
 */
export function subscribeToRegistrosPostas(
  onData: (registros: RegistroPosta[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(firestoreDb, 'registrosPostas');
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(300));
  return onSnapshot(q, (snapshot) => {
    const list: RegistroPosta[] = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id as any, ...(docSnap.data() as any) });
    });
    onData(list);
  }, (err) => {
    console.error('Error escuchando registros en tiempo real:', err);
    if (onError) onError(err);
  });
}

/**
 * Inicializa la base de datos en la nube si aún está vacía con los 243 peregrinos
 */
export async function initializeFirestoreIfNeeded(): Promise<Peregrino[]> {
  try {
    const colRef = collection(firestoreDb, 'peregrinos');
    const snapshot = await getDocs(colRef);

    if (snapshot.size === 0) {
      console.log('Padrón vacío en Firebase. Sembrando 243 peregrinos oficiales...');
      const initialPilgrims = getInitialPilgrims();
      
      // Batch writes en lotes de 200 (límite de Firestore es 500)
      const batches = [];
      let currentBatch = writeBatch(firestoreDb);
      let count = 0;

      for (const p of initialPilgrims) {
        const docRef = doc(firestoreDb, 'peregrinos', p.id);
        currentBatch.set(docRef, p);
        count++;

        if (count % 200 === 0) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(firestoreDb);
        }
      }
      batches.push(currentBatch.commit());
      await Promise.all(batches);
      console.log('Sembrado inicial de 243 peregrinos completado exitosamente en Firebase.');
      return initialPilgrims;
    }

    const list: Peregrino[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Peregrino);
    });
    list.sort((a, b) => a.id.localeCompare(b.id));
    return list;
  } catch (err) {
    console.error('Error en initializeFirestoreIfNeeded:', err);
    return getInitialPilgrims();
  }
}

/**
 * Registra el paso de un peregrino en tiempo real hacia Firebase
 */
export async function registrarPasoFirebase({
  peregrino,
  posta,
  estado,
  detalle,
  tomadorNombre = 'Hno. Lucas',
}: {
  peregrino: Peregrino;
  posta: PostaNombre;
  estado: EstadoPeregrino;
  detalle?: string;
  tomadorNombre?: string;
}): Promise<{ peregrinoActualizado: Peregrino; registro: RegistroPosta }> {
  const now = Date.now();
  const detalleFinal = detalle || (
    estado === 'CAMINANDO' ? `Paso confirmado por ${posta}` :
    estado === 'MOVIL_APOYO' ? 'Subió a Móvil de Apoyo' : 'Retiro / Abandono de marcha'
  );

  const peregrinoActualizado: Peregrino = {
    ...peregrino,
    estadoActual: estado,
    subEstadoDetalle: detalleFinal,
    ultimaPosta: posta,
    ultimoTimestamp: now,
    tomadorUltimoRegistro: tomadorNombre,
  };

  const nuevoRegistro: RegistroPosta = {
    peregrinoId: peregrino.id,
    idCorto: peregrino.idCorto,
    nombreCompleto: `${peregrino.nombre} ${peregrino.apellido}`.trim(),
    posta,
    estado,
    detalle: detalleFinal,
    tomadorId: 'TOMADOR-POSTA',
    tomadorNombre,
    timestamp: now,
    synched: 1,
    syncedAt: now,
  };

  // Guardar peregrino y nuevo registro en lote
  const batch = writeBatch(firestoreDb);
  const peregrinoRef = doc(firestoreDb, 'peregrinos', peregrino.id);
  const registroRef = doc(collection(firestoreDb, 'registrosPostas'));

  batch.set(peregrinoRef, peregrinoActualizado);
  batch.set(registroRef, nuevoRegistro);

  await batch.commit();

  return {
    peregrinoActualizado,
    registro: { ...nuevoRegistro, id: registroRef.id as any }
  };
}

/**
 * REINICIAR / LIMPIAR PRUEBAS:
 * Permite limpiar todos los escaneos de prueba que hagan esta noche y dejar a los 243 peregrinos en estado inicial
 */
export async function reiniciarPruebasFirebase(): Promise<void> {
  console.log('Reiniciando base de datos y limpiando pruebas...');
  
  // 1. Borrar registros de historial
  const registrosSnapshot = await getDocs(collection(firestoreDb, 'registrosPostas'));
  const deleteBatches = [];
  let deleteBatch = writeBatch(firestoreDb);
  let dCount = 0;

  registrosSnapshot.forEach((snap) => {
    deleteBatch.delete(snap.ref);
    dCount++;
    if (dCount % 200 === 0) {
      deleteBatches.push(deleteBatch.commit());
      deleteBatch = writeBatch(firestoreDb);
    }
  });
  deleteBatches.push(deleteBatch.commit());
  await Promise.all(deleteBatches);

  // 2. Restablecer los 243 peregrinos a estado "CAMINANDO" inicial
  const initialPilgrims = getInitialPilgrims();
  const resetBatches = [];
  let resetBatch = writeBatch(firestoreDb);
  let rCount = 0;

  for (const p of initialPilgrims) {
    const docRef = doc(firestoreDb, 'peregrinos', p.id);
    resetBatch.set(docRef, {
      ...p,
      estadoActual: 'CAMINANDO',
      subEstadoDetalle: 'Listo para iniciar marcha',
      ultimaPosta: 'Sin registros',
      ultimoTimestamp: null,
      tomadorUltimoRegistro: null,
    });
    rCount++;
    if (rCount % 200 === 0) {
      resetBatches.push(resetBatch.commit());
      resetBatch = writeBatch(firestoreDb);
    }
  }
  resetBatches.push(resetBatch.commit());
  await Promise.all(resetBatches);
  console.log('Limpieza de pruebas completada en Firebase.');
}
