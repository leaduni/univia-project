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
  // Fallback por defecto para producción si no se configuró la variable de entorno
  if (process.env.NODE_ENV === "production") {
    return "https://venus.leaduni.org/api";
  }
  
  return "http://localhost:8000/api";
}

/** URL base de la API REST del backend (ya incluye el sufijo `/api`). */
export const API_URL = calcularApiUrl();