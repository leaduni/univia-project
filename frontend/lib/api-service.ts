// API service layer - Supabase calls for auth, malla, stats

import { supabase } from './supabase';
import { leerOCache, invalidarClave, invalidarPrefijo, limpiarCache, TTL } from './api-cache';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// Memoización de getSession: N llamadas paralelas a getAuthToken comparten una
// sola lectura de sesión (y un solo posible refresh del token).
let sesionEnCurso: ReturnType<typeof supabase.auth.getSession> | null = null;

async function getAuthToken() {
    if (!sesionEnCurso) {
        sesionEnCurso = supabase.auth
            .getSession()
            .finally(() => {
                sesionEnCurso = null;
            });
    }
    const { data: { session } } = await sesionEnCurso;
    return session?.access_token || null;
}

let redirigiendoSesionInvalida = false;

/**
 * HTTP 401: sesión inválida o expirada. Limpia las credenciales y redirige a
 * /auth/login sin mostrar el error en pantalla.
 */
function manejarNoAutorizado() {
    // Varias llamadas 401 en paralelo deben provocar una sola limpieza.
    if (redirigiendoSesionInvalida) return;
    redirigiendoSesionInvalida = true;
    limpiarCache();

    if (typeof window === "undefined") return;
    // En páginas de autenticación no hay sesión que invalidar.
    if (window.location.pathname.startsWith("/auth/")) return;

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // signOut dispara SIGNED_OUT y el auth-context limpia su estado;
    // la recarga que trae assign() resetea el flag por sí sola.
    supabase.auth.signOut().catch(() => {});
    window.location.assign('/auth/login');
}

async function fetchWithAuth(url: string, options: RequestInit = {}, customToken?: string) {
    const token = customToken || await getAuthToken();
    const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
    };

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        manejarNoAutorizado();
    }
    return response;
}

/**
 * Mensaje legible del cuerpo de un error del backend.
 *
 * La API responde de dos formas: `{errors: [{field, message}]}` cuando la
 * validación falla en un campo concreto, y `{detail: "..."}` en el resto.
 * El mensaje del campo va primero porque es el que le dice al estudiante
 * qué corregir.
 */
function extraerMensajeError(body: any): string | null {
    return body?.errors?.[0]?.message || body?.detail || null;
}

/**
 * Error de la API con el campo que lo originó.
 *
 * Varios endpoints del dashboard responden 400 con `field: "carrera_id"` o
 * `field: "malla_id"` cuando el estudiante todavía no completó su onboarding.
 * Antes se descartaba el cuerpo y se lanzaba un mensaje fijo, así que la
 * pantalla no distinguía "falta tu onboarding" de "el servidor se cayó" y no
 * podía reaccionar.
 */
export interface ApiError extends Error {
    status?: number;
    field?: string;
    /** El estudiante aún no completó su onboarding: no es un fallo real. */
    requiereOnboarding?: boolean;
    /** HTTP 401: la sesión expiró o dejó de ser válida. */
    sesionInvalida?: boolean;
}

/** Filtros aceptados por GET /recursos. Espejo de `recursos.py`. */
export interface RecursoFiltros {
    /** Uno o varios tipos separados por coma. */
    tipo?: string;
    ciclo?: number;
    curso_id?: number;
    codigo_curso?: string;
    year?: number;
    facultad?: string;
    search?: string;
    orden?: 'recent' | 'downloaded' | 'rated';
    /** Restringe a los cursos que el estudiante lleva ahora. */
    mis_cursos?: boolean;
    limit?: number;
    offset?: number;
}

export interface RecursosPagina {
    items: any[];
    total: number;
    /** true cuando se pidió `mis_cursos` y el estudiante no tiene ninguno activo. */
    sinCursosActivos: boolean;
    /** Facultad a la que el backend acotó el listado. Solo para mostrar contexto. */
    facultad?: string | null;
}

function construirParamsRecursos(filters: RecursoFiltros): URLSearchParams {
    const params = new URLSearchParams();
    if (filters.tipo && filters.tipo !== 'all') params.append('tipo', filters.tipo);
    if (filters.ciclo) params.append('ciclo', filters.ciclo.toString());
    if (filters.curso_id) params.append('curso_id', filters.curso_id.toString());
    if (filters.codigo_curso) params.append('codigo_curso', filters.codigo_curso);
    if (filters.year) params.append('year', filters.year.toString());
    if (filters.facultad && filters.facultad !== 'all') params.append('facultad', filters.facultad);
    if (filters.search) params.append('search', filters.search);
    if (filters.orden) params.append('orden', filters.orden);
    if (filters.mis_cursos) params.append('mis_cursos', 'true');
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    return params;
}

async function errorDeRespuesta(response: Response, fallback: string): Promise<ApiError> {
    const body = await response.json().catch(() => null);
    const field = body?.errors?.[0]?.field;
    const error = new Error(extraerMensajeError(body) || fallback) as ApiError;
    error.status = response.status;
    error.field = field;
    error.requiereOnboarding =
        response.status === 400 && (field === "carrera_id" || field === "malla_id");
    error.sesionInvalida = response.status === 401;
    return error;
}

export const apiService = {
    async getMalla() {
        try {
            return await leerOCache("malla", async () => {
                const response = await fetchWithAuth(`${API_URL}/malla`);
                if (!response.ok) {
                    throw new Error(`Error fetching malla: ${response.statusText}`);
                }
                return await response.json();
            }, { ttl: TTL.CINCO_MINUTOS });
        } catch (error) {
            console.error("API Error (getMalla):", error);
            throw error;
        }
    },

    /**
     * Actualiza los datos personales del estudiante (RF-PRF-02).
     * Solo el nombre: el correo y el código no son editables.
     */
    async actualizarPerfil(nombreCompleto: string) {
        const response = await fetchWithAuth(`${API_URL}/usuarios/perfil`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_completo: nombreCompleto }),
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(extraerMensajeError(body) || 'No se pudieron guardar tus datos.');
        }
        invalidarClave("profile");
        return body;
    },

    /** Cambia el plan de estudios / malla del estudiante (PATCH /usuarios/me/malla). */
    async cambiarMalla(malla_id: number) {
        const response = await fetchWithAuth(`${API_URL}/usuarios/me/malla`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ malla_id }),
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(extraerMensajeError(body) || 'No se pudo cambiar tu plan de estudios.');
        }
        // Cambiar la malla invalida todo lo derivado del plan.
        limpiarCache();
        return body;
    },

    /** Cambia la contraseña desde el perfil (RF-PRF-03). */
    async cambiarPassword(passwordActual: string, passwordNueva: string) {
        const response = await fetchWithAuth(`${API_URL}/usuarios/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password_actual: passwordActual,
                password_nueva: passwordNueva,
            }),
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(extraerMensajeError(body) || 'No se pudo actualizar tu contraseña.');
        }
        invalidarClave("profile");
        return body;
    },

    /**
     * Cursos en curso con su avance real y el tema donde se quedó.
     * Un solo llamado en vez de un /learning-path por curso.
     */
    async getCursosActivos() {
        try {
            return await leerOCache("cursos-activos", async () => {
                const response = await fetchWithAuth(`${API_URL}/dashboard/cursos-activos`);
                if (!response.ok) {
                    throw new Error('No se pudieron cargar tus cursos activos.');
                }
                return await response.json();
            }, { ttl: TTL.UN_MINUTO });
        } catch (error) {
            console.error("API Error (getCursosActivos):", error);
            throw error;
        }
    },

    /**
     * Diagnóstico académico y ruta sugerida (RF-19, RF-20).
     * Se deriva del récord del estudiante, no de un cuestionario.
     */
    async getTestNivel() {
        try {
            return await leerOCache("test-nivel", async () => {
                const response = await fetchWithAuth(`${API_URL}/dashboard/test-nivel`);
                if (!response.ok) {
                    if (response.status === 401) return null;
                    const apiError = await errorDeRespuesta(response, 'No se pudo cargar tu diagnóstico académico.');
                    // Onboarding pendiente (400 + field carrera_id) es un estado normal
                    // de la cuenta, no un fallo: se devuelve null, sin lanzar.
                    if (apiError.requiereOnboarding) return null;
                    throw apiError;
                }
                return await response.json();
            }, { ttl: TTL.CINCO_MINUTOS });
        } catch (error) {
            // Un onboarding pendiente es un estado normal de la cuenta, no un
            // fallo: quien llama decide qué mostrar sin ensuciar la consola.
            if (!(error as ApiError)?.requiereOnboarding) {
                console.error("API Error (getTestNivel):", error);
            }
            throw error;
        }
    },

    /**
     * Actividad del estudiante con filtros (RF-21, RF-22).
     * @param periodo 7d | 30d | 90d | semestre | todo
     */
    async getActividad(periodo: string = '30d', cursoId?: number) {
        try {
            const params = new URLSearchParams({ periodo });
            if (cursoId !== undefined) params.set('curso_id', String(cursoId));

            return await leerOCache(`actividad:${params.toString()}`, async () => {
                const response = await fetchWithAuth(`${API_URL}/dashboard/actividad?${params}`);
                if (!response.ok) {
                    throw new Error('No se pudo cargar tu actividad.');
                }
                return await response.json();
            }, { ttl: TTL.CINCO_MINUTOS });
        } catch (error) {
            console.error("API Error (getActividad):", error);
            throw error;
        }
    },

    /**
     * Avance de carrera sobre el total de créditos del plan (RF-07).
     * Es la cifra oficial: no la recalcules a partir de la malla.
     */
    async getAvanceCarrera() {
        try {
            return await leerOCache("avance", async () => {
                const response = await fetchWithAuth(`${API_URL}/malla/avance`);
                if (!response.ok) {
                    if (response.status === 401) return null;
                    const apiError = await errorDeRespuesta(response, 'No se pudo cargar tu avance de carrera.');
                    if (apiError.requiereOnboarding) return null;
                    throw apiError;
                }
                return await response.json();
            }, { ttl: TTL.UN_MINUTO });
        } catch (error) {
            if (!(error as ApiError)?.requiereOnboarding) {
                console.error("API Error (getAvanceCarrera):", error);
            }
            throw error;
        }
    },

    async getDashboardSummary() {
        try {
            return await leerOCache("summary", async () => {
                const response = await fetchWithAuth(`${API_URL}/dashboard/summary`);
                if (!response.ok) {
                    throw new Error(`Error fetching summary: ${response.statusText}`);
                }
                return await response.json();
            }, { ttl: TTL.UN_MINUTO });
        } catch (error) {
            console.error("API Error (getDashboardSummary):", error);
            throw error;
        }
    },

    async getDashboardStats() {
        try {
            const response = await fetchWithAuth(`${API_URL}/dashboard/stats`);
            if (!response.ok) {
                throw new Error(`Error fetching stats: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getDashboardStats):", error);
            throw error;
        }
    },

    async getLogros() {
        try {
            const response = await fetchWithAuth(`${API_URL}/dashboard/logros`);
            if (!response.ok) {
                throw new Error(`Error fetching logros: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getLogros):", error);
            throw error;
        }
    },

    async getCourse(id: string | number) {
        try {
            const response = await fetchWithAuth(`${API_URL}/cursos/${id}`);
            if (!response.ok) {
                throw new Error(`Error fetching course ${id}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (getCourse ${id}):`, error);
            throw error;
        }
    },

    async getLearningPath(courseId: string | number) {
        try {
            return await leerOCache(`learning-path:${courseId}`, async () => {
                const response = await fetchWithAuth(`${API_URL}/curso/${courseId}/learning-path`);
                if (!response.ok) {
                    let errorMsg = `Error ${response.status}: ${response.statusText}`;
                    try {
                        const errorBody = await response.json();
                        if (errorBody.detail) errorMsg = errorBody.detail;
                    } catch {}
                    const error: any = new Error(errorMsg);
                    error.status = response.status;
                    throw error;
                }
                return await response.json();
            }, { ttl: TTL.CINCO_MINUTOS });
        } catch (error) {
            console.error(`API Error (getLearningPath ${courseId}):`, error);
            throw error;
        }
    },

    async getProfesoresCurso(courseId: string | number) {
        try {
            return await leerOCache(`profesores-curso:${courseId}`, async () => {
                const response = await fetchWithAuth(`${API_URL}/curso/${courseId}/profesores`);
                if (!response.ok) {
                    let errorMsg = `Error ${response.status}: ${response.statusText}`;
                    try {
                        const errorBody = await response.json();
                        if (errorBody.detail) errorMsg = errorBody.detail;
                    } catch {}
                    const error: any = new Error(errorMsg);
                    error.status = response.status;
                    throw error;
                }
                return await response.json();
            }, { ttl: TTL.CINCO_MINUTOS });
        } catch (error) {
            console.error(`API Error (getProfesoresCurso ${courseId}):`, error);
            throw error;
        }
    },

    async completeStep(courseId: string | number, stepId: string | number) {
        try {
            const response = await fetchWithAuth(`${API_URL}/curso/${courseId}/step/${stepId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Error completing step: ${response.statusText}`);
            }
            // El avance y el learning path cambian al completar un paso.
            invalidarPrefijo(`learning-path:${courseId}`);
            invalidarClave("cursos-activos");
            invalidarClave("avance");
            invalidarClave("summary");
            return await response.json();
        } catch (error) {
            console.error('API Error (completeStep):', error);
            throw error;
        }
    },

    async downloadPlancha(courseId: string | number, filename: string) {
        try {
            const url = `${API_URL}/curso/${courseId}/plancha/${encodeURIComponent(filename)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al descargar el archivo');
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading plancha:', error);
            throw error;
        }
    },

    /**
     * Página del banco de recursos. El backend filtra, ordena y pagina: antes
     * la biblioteca se bajaba el catálogo entero y filtraba en el navegador.
     */
    async getRecursosPaginados(filters: RecursoFiltros = {}): Promise<RecursosPagina> {
        const vacia: RecursosPagina = { items: [], total: 0, sinCursosActivos: false, facultad: null };
        try {
            const params = construirParamsRecursos(filters);

            return await leerOCache(`recursos:${params.toString()}`, async () => {
                const token = await getAuthToken();
                if (!token) return vacia;

                const response = await fetchWithAuth(`${API_URL}/recursos?${params.toString()}`, {}, token);
                if (response.status === 401) return vacia;
                if (!response.ok) {
                    throw new Error(`Error fetching recursos: ${response.statusText}`);
                }

                const body = await response.json();
                // Tolera la forma antigua (array plano) por si queda un backend sin desplegar.
                if (Array.isArray(body)) {
                    return { items: body, total: body.length, sinCursosActivos: false };
                }
                return {
                    items: body?.items ?? [],
                    total: body?.total ?? 0,
                    sinCursosActivos: Boolean(body?.sin_cursos_activos),
                    facultad: body?.facultad ?? null,
                };
            }, { ttl: TTL.CINCO_MINUTOS });
        } catch (error) {
            console.error("API Error (getRecursosPaginados):", error);
            throw error;
        }
    },

    /** Lista simple de recursos, para pantallas que no paginan. */
    async getRecursos(filters: RecursoFiltros = {}) {
        try {
            // Sin `limit` explícito el backend pagina de 20 en 20; estas
            // pantallas (banco de exámenes de un curso, recientes) esperan el
            // listado completo, así que se pide el máximo que admite.
            const { items } = await apiService.getRecursosPaginados({ limit: 100, ...filters });
            return items;
        } catch (error) {
            console.error("API Error (getRecursos):", error);
            throw error;
        }
    },

    async getEnvironmentCursos(carreraId: number, cicloActual: number, mallaId?: number) {
        try {
            const params = new URLSearchParams({
                carrera_id: carreraId.toString(),
                ciclo_actual: cicloActual.toString()
            });
            if (mallaId) {
                params.append('malla_id', mallaId.toString());
            }
            return await leerOCache(`onboarding-cursos:${params.toString()}`, async () => {
                const response = await fetchWithAuth(`${API_URL}/onboarding/cursos?${params}`);
                if (!response.ok) {
                    throw new Error(`Error al obtener los cursos: ${response.statusText}`);
                }
                return await response.json();
            }, { ttl: TTL.DIEZ_MINUTOS });
        } catch (error) {
            console.error("API Error (getEnvironmentCursos):", error);
            throw error;
        }
    },

    async completarCurso(cursoId: number) {
        try {
            const response = await fetchWithAuth(`${API_URL}/cursos/${cursoId}/completar`, {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('No se pudo marcar el curso como completado');
            }
            invalidarPrefijo(`learning-path:${cursoId}`);
            invalidarClave("cursos-activos");
            invalidarClave("avance");
            invalidarClave("summary");
            return await response.json();
        } catch (error) {
            console.error("API Error (completarCurso):", error);
            throw error;
        }
    },

    async getOnboardingData() {
        try {
            return await leerOCache("onboarding-data", async () => {
                const response = await fetchWithAuth(`${API_URL}/onboarding/data`);
                if (!response.ok) {
                    throw new Error(`Error fetching onboarding data: ${response.statusText}`);
                }
                return await response.json();
            }, { ttl: TTL.DIEZ_MINUTOS });
        } catch (error) {
            console.error("API Error (getOnboardingData):", error);
            throw error;
        }
    },

    async getMallasPorCarrera(carreraId: number) {
        try {
            return await leerOCache(`mallas-carrera:${carreraId}`, async () => {
                const response = await fetchWithAuth(`${API_URL}/onboarding/mallas?carrera_id=${carreraId}`);
                if (!response.ok) {
                    throw new Error(`Error al obtener mallas de la carrera: ${response.statusText}`);
                }
                return await response.json();
            }, { ttl: TTL.DIEZ_MINUTOS });
        } catch (error) {
            console.error("API Error (getMallasPorCarrera):", error);
            throw error;
        }
    },

    async completeOnboarding(data: {
        carrera_id: number;
        malla_id?: number;
        ciclo_actual: number;
        cursos_inscritos: number[];
        /** Historial declarado en el wizard: cursos de ciclos previos ya aprobados. */
        cursos_aprobados?: number[];
    }) {
        try {
            const response = await fetchWithAuth(`${API_URL}/onboarding/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(extraerMensajeError(errorBody) || `Error completing onboarding: ${response.statusText}`);
            }

            // El onboarding define el plan del estudiante: todo lo derivado
            // (malla, avance, cursos, perfil) queda obsoleto.
            limpiarCache();
            return await response.json();
        } catch (error) {
            console.error("API Error (completeOnboarding):", error);
            throw error;
        }
    },

    /**
     * Inicia sesión contra el backend (RF-01), que acepta correo institucional
     * o código universitario. Antes esto llamaba a Supabase directamente, lo
     * que hacía imposible entrar con el código.
     */
    async login(credentials: { identificador: string; password: string }) {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                const mensaje = body?.errors?.[0]?.message
                    || body?.detail
                    || "No pudimos validar tus credenciales.";
                // Credenciales inválidas son un resultado esperado: la UI las
                // muestra; no deben disparar el overlay "Console Error" de dev.
                const credencialesInvalidas = new Error(mensaje) as any;
                credencialesInvalidas.esCredencialesInvalidas = true;
                throw credencialesInvalidas;
            }

            // El resto de la app obtiene el token desde el cliente de Supabase
            // (fetchWithAuth -> getSession). Como la sesión la creó el backend,
            // hay que cargarla aquí o toda petición posterior saldría sin token.
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: body.access_token,
                refresh_token: body.refresh_token,
            });
            if (sessionError) {
                throw new Error("No se pudo iniciar la sesión en el navegador.");
            }

            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(body.usuario));
                localStorage.setItem('token', body.access_token);
            }

            // Sesión nueva: nada de lo cacheado del usuario anterior aplica.
            limpiarCache();

            return {
                user: body.usuario,
                token: body.access_token,
                carrera: body.carrera,
                planEstudios: body.plan_estudios,
                onboardingCompletado: body.onboarding_completado,
            };
        } catch (error: any) {
            // Credenciales inválidas no son un fallo del sistema: se omiten en
            // la consola para no activar el overlay de error de desarrollo.
            if (!error?.esCredencialesInvalidas) {
                console.error("API Error (login):", error);
            }
            throw new Error(error.message || "Login failed");
        }
    },

    /**
     * Pide el correo de recuperación de contraseña (RF-03).
     *
     * El backend responde lo mismo exista o no la cuenta, para no revelar qué
     * correos están registrados. La UI debe mostrar ese mensaje tal cual.
     */
    async solicitarRecuperacion(email: string) {
        try {
            const response = await fetch(`${API_URL}/auth/recuperar-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    body?.errors?.[0]?.message || "No pudimos procesar tu solicitud."
                );
            }

            return body;
        } catch (error: any) {
            console.error("API Error (solicitarRecuperacion):", error);
            throw new Error(error.message || "No pudimos procesar tu solicitud.");
        }
    },

    /**
     * Guarda la contraseña nueva (RF-03). Requiere la sesión temporal que
     * Supabase crea al abrir el enlace del correo.
     */
    async restablecerPassword(passwordNueva: string) {
        try {
            const response = await fetchWithAuth(`${API_URL}/auth/restablecer-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password_nueva: passwordNueva }),
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    body?.errors?.[0]?.message || "No se pudo actualizar la contraseña."
                );
            }

            return body;
        } catch (error: any) {
            console.error("API Error (restablecerPassword):", error);
            throw new Error(error.message || "No se pudo actualizar la contraseña.");
        }
    },

    async getProfile(customToken?: string) {
        try {
            return await leerOCache("profile", async () => {
                const response = await fetchWithAuth(`${API_URL}/usuarios/me`, {}, customToken);
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    console.error("getProfile error response:", errorBody);
                    throw new Error(`Error fetching profile: ${response.statusText}`);
                }
                return await response.json();
            }, { ttl: TTL.UN_MINUTO });
        } catch (error) {
            console.error("API Error (getProfile):", error);
            throw error;
        }
    },

    async signup(data: { email: string; password: string; fullName: string; codigoUni: string }) {

        try {
            const response = await fetch(`${API_URL}/auth/register-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    codigo_estudiante: data.codigoUni,
                    nombre_completo: data.fullName,
                }),
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                const validationErrors = body?.errors;
                if (validationErrors && validationErrors.length > 0) {
                    const errorObj = new Error(validationErrors.map((e: any) => e.message).join('. ')) as any;
                    errorObj.validationErrors = validationErrors;
                    throw errorObj;
                }
                throw new Error(body?.detail || 'Error al registrar la cuenta.');
            }

            return body;
        } catch (error: any) {
            if (error.validationErrors) throw error;
            console.error("Signup error:", error);
            throw new Error(error.message || "Error al registrar la cuenta.");
        }
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        limpiarCache();
        if (error) console.error("Error signing out:", error);
    }
};
