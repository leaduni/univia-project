// Capa de caché en memoria con Stale-While-Revalidate y single-flight.
//
// La app consulta los mismos endpoints desde varias pantallas y, en desarrollo,
// React StrictMode dispara los efectos dos veces. Esta capa centraliza ese
// acceso para que una sola petición sirva a todos los consumidores de una
// misma clave mientras el dato es fresco; cuando vence, se devuelve el dato
// anterior y se refresca en segundo plano sin bloquear la UI.

export const TTL = {
    /** Datos que cambian con la actividad del estudiante (avance, resumen). */
    UN_MINUTO: 60_000,
    /** Datos estables durante la sesión (malla, recursos, aprendizaje). */
    CINCO_MINUTOS: 5 * 60_000,
    /** Catálogos que casi nunca cambian (onboarding, mallas por carrera). */
    DIEZ_MINUTOS: 10 * 60_000,
} as const;

type EntradaCache = {
    data: unknown;
    timestamp: number;
};

const almacen = new Map<string, EntradaCache>();
// Single-flight: unifica peticiones concurrentes a la misma clave.
const enVuelo = new Map<string, Promise<unknown>>();

/**
 * Lee o rellena la caché de `clave`.
 *
 * - Con dato fresco: se devuelve al instante (sin red).
 * - Con dato vencido: se devuelve el dato anterior y se refresca en segundo
 *   plano (stale-while-revalidate), sin bloquear al llamador.
 * - Sin dato: se ejecuta `cargar`; las llamadas simultáneas a la misma clave
 *   comparten una sola petición.
 */
export async function leerOCache<T>(
    clave: string,
    cargar: () => Promise<T>,
    opciones: { ttl?: number } = {},
): Promise<T> {
    const ttl = opciones.ttl ?? TTL.CINCO_MINUTOS;
    const previa = almacen.get(clave);

    if (previa) {
        const fresca = Date.now() - previa.timestamp < ttl;
        if (!fresca) {
            refrescarEnSegundoPlano(clave, cargar, ttl);
        }
        return previa.data as T;
    }

    const enCurso = enVuelo.get(clave);
    if (enCurso) {
        return enCurso as Promise<T>;
    }

    const promesa = cargar()
        .then((data) => {
            almacen.set(clave, { data, timestamp: Date.now() });
            return data;
        })
        .finally(() => {
            enVuelo.delete(clave);
        });
    enVuelo.set(clave, promesa);
    return promesa;
}

async function refrescarEnSegundoPlano<T>(
    clave: string,
    cargar: () => Promise<T>,
    ttl: number,
): Promise<void> {
    // Un refresh ya en vuelo se encarga de actualizar el almacén.
    if (enVuelo.has(clave)) return;

    const promesa = cargar()
        .then((data) => {
            almacen.set(clave, { data, timestamp: Date.now() });
        })
        .catch(() => {
            // El refresco falló: se conserva el dato vencido; el próximo
            // acceso reintentará.
        })
        .finally(() => {
            enVuelo.delete(clave);
        });
    enVuelo.set(clave, promesa);
}

/** Elimina una clave concreta (tras una mutación que la invalida). */
export function invalidarClave(clave: string): void {
    almacen.delete(clave);
    enVuelo.delete(clave);
}

/** Elimina todas las claves que comiencen con el prefijo dado. */
export function invalidarPrefijo(prefijo: string): void {
    for (const clave of almacen.keys()) {
        if (clave.startsWith(prefijo)) {
            almacen.delete(clave);
        }
    }
    for (const clave of enVuelo.keys()) {
        if (clave.startsWith(prefijo)) {
            enVuelo.delete(clave);
        }
    }
}

/** Vacía toda la caché (login, logout, sesión inválida). */
export function limpiarCache(): void {
    almacen.clear();
    enVuelo.clear();
}