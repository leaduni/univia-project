// URL base de la API del backend, centralizada.
//
// IMPORTANTE: Next.js sustituye las variables `NEXT_PUBLIC_*` en BUILD TIME,
// así que este valor queda horneado en el bundle. Por eso aquí se aplica
// fail-fast en producción: si falta NEXT_PUBLIC_API_URL, la aplicación falla
// al importar/en build en vez de servir un bundle que llama a localhost.
// En desarrollo (sin .env.local) se conserva el default localhost anterior.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

function calcularApiUrl(): string {
  if (BASE_URL) {
    return BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`;
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8000/api";
  }
  throw new Error(
    "NEXT_PUBLIC_API_URL no está configurada. " +
      "En producción debe apuntar al backend desplegado (ej. https://api.univia.pe).",
  );
}

/** URL base de la API REST del backend (ya incluye el sufijo `/api`). */
export const API_URL = calcularApiUrl();