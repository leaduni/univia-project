// API service layer - Supabase calls for auth, malla, stats

import { supabase } from './supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

async function getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}, customToken?: string) {
    const token = customToken || await getAuthToken();
    const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
    };

    return fetch(url, { ...options, headers });
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

export const apiService = {
    async getMalla() {
        try {
            const response = await fetchWithAuth(`${API_URL}/malla`);
            if (!response.ok) {
                throw new Error(`Error fetching malla: ${response.statusText}`);
            }
            return await response.json();
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
        return body;
    },

    /**
     * Cursos en curso con su avance real y el tema donde se quedó.
     * Un solo llamado en vez de un /learning-path por curso.
     */
    async getCursosActivos() {
        try {
            const response = await fetchWithAuth(`${API_URL}/dashboard/cursos-activos`);
            if (!response.ok) {
                throw new Error('No se pudieron cargar tus cursos activos.');
            }
            return await response.json();
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
            const response = await fetchWithAuth(`${API_URL}/dashboard/test-nivel`);
            if (!response.ok) {
                throw new Error('No se pudo cargar tu diagnóstico académico.');
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getTestNivel):", error);
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

            const response = await fetchWithAuth(`${API_URL}/dashboard/actividad?${params}`);
            if (!response.ok) {
                throw new Error('No se pudo cargar tu actividad.');
            }
            return await response.json();
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
            const response = await fetchWithAuth(`${API_URL}/malla/avance`);
            if (!response.ok) {
                throw new Error('No se pudo cargar tu avance de carrera.');
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getAvanceCarrera):", error);
            throw error;
        }
    },

    async getDashboardSummary() {
        try {
            const response = await fetchWithAuth(`${API_URL}/dashboard/summary`);
            if (!response.ok) {
                throw new Error(`Error fetching summary: ${response.statusText}`);
            }
            return await response.json();
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
        } catch (error) {
            console.error(`API Error (getLearningPath ${courseId}):`, error);
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

    async getRecursos(filters: { tipo?: string; ciclo?: number; curso_id?: number; codigo_curso?: string; year?: number; facultad?: string; search?: string } = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.tipo && filters.tipo !== 'all') params.append('tipo', filters.tipo);
            if (filters.ciclo) params.append('ciclo', filters.ciclo.toString());
            if (filters.curso_id) params.append('curso_id', filters.curso_id.toString());
            if (filters.codigo_curso) params.append('codigo_curso', filters.codigo_curso);
            if (filters.year) params.append('year', filters.year.toString());
            if (filters.facultad && filters.facultad !== 'all') params.append('facultad', filters.facultad);
            if (filters.search) params.append('search', filters.search);

            const token = await getAuthToken();
            if (!token) {
                return [];
            }

            const response = await fetchWithAuth(`${API_URL}/recursos?${params.toString()}`, {}, token);
            if (response.status === 401) {
                return [];
            }
            if (!response.ok) {
                throw new Error(`Error fetching recursos: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getRecursos):", error);
            throw error;
        }
    },

    async getEnvironmentCursos(carreraId: number, cicloActual: number) {
        try {
            const params = new URLSearchParams({
                carrera_id: carreraId.toString(),
                ciclo_actual: cicloActual.toString()
            });
            const response = await fetchWithAuth(`${API_URL}/onboarding/cursos?${params}`);
            if (!response.ok) {
                throw new Error(`Error al obtener los cursos: ${response.statusText}`);
            }
            return await response.json();
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
            return await response.json();
        } catch (error) {
            console.error("API Error (completarCurso):", error);
            throw error;
        }
    },

    async getOnboardingData() {
        try {
            const response = await fetchWithAuth(`${API_URL}/onboarding/data`);
            if (!response.ok) {
                throw new Error(`Error fetching onboarding data: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getOnboardingData):", error);
            throw error;
        }
    },

    async completeOnboarding(data: {
        carrera_id: number;
        ciclo_actual: number;
        cursos_inscritos: number[];
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
                throw new Error(errorBody.detail || `Error completing onboarding: ${response.statusText}`);
            }

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
                throw new Error(mensaje);
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

            return {
                user: body.usuario,
                token: body.access_token,
                carrera: body.carrera,
                planEstudios: body.plan_estudios,
                onboardingCompletado: body.onboarding_completado,
            };
        } catch (error: any) {
            console.error("API Error (login):", error);
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
            const response = await fetchWithAuth(`${API_URL}/usuarios/me`, {}, customToken);
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                console.error("getProfile error response:", errorBody);
                throw new Error(`Error fetching profile: ${response.statusText}`);
            }
            return await response.json();
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
        if (error) console.error("Error signing out:", error);
    }
};
