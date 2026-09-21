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

function persistirCache(clave: string, data: unknown, timestamp: number) {
    if (typeof window !== "undefined") {
        try {
            localStorage.setItem(`univia_cache_${clave}`, JSON.stringify({ data, timestamp }));
        } catch (e) {
            // Ignorar errores de quota o navegación privada
        }
    }
}

function recuperarCache(clave: string): EntradaCache | undefined {
    if (almacen.has(clave)) {
        return almacen.get(clave);
    }
    if (typeof window !== "undefined") {
        try {
            const raw = localStorage.getItem(`univia_cache_${clave}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                almacen.set(clave, parsed);
                return parsed;
            }
        } catch (e) {
            // Ignorar errores
        }
    }
    return undefined;
}

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
    const previa = recuperarCache(clave);

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
            const ts = Date.now();
            almacen.set(clave, { data, timestamp: ts });
            persistirCache(clave, data, ts);
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
            const ts = Date.now();
            almacen.set(clave, { data, timestamp: ts });
            persistirCache(clave, data, ts);
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

/**
 * Lectura síncrona de la caché (para render sin parpadeo).
 *
 * Devuelve el dato cacheado si existe —aunque esté vencido— para pintar el
 * contenido real desde el primer frame y revalidar en segundo plano. Devuelve
 * `undefined` si no hay nada (el llamador cae a su estado de carga normal).
 */
export function picoCache<T>(clave: string): T | undefined {
    return recuperarCache(clave)?.data as T | undefined;
}

/** Elimina una clave concreta (tras una mutación que la invalida). */
export function invalidarClave(clave: string): void {
    almacen.delete(clave);
    enVuelo.delete(clave);
    if (typeof window !== "undefined") {
        localStorage.removeItem(`univia_cache_${clave}`);
    }
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
    if (typeof window !== "undefined") {
        // En localStorage iteramos de manera segura
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`univia_cache_${prefijo}`)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }
}

/** Vacía toda la caché (login, logout, sesión inválida). */
export function limpiarCache(): void {
    almacen.clear();
    enVuelo.clear();
    if (typeof window !== "undefined") {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("univia_cache_")) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }
}