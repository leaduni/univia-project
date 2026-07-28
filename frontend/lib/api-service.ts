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
    console.log(`Fetch with Auth: ${url}, Token present: ${!!token}`);
    const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
    };

    return fetch(url, { ...options, headers });
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

    async updateCourseStatus(courseId: number, status: string) {
        try {
            const response = await fetchWithAuth(`${API_URL}/malla-curricular/update-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ course_id: courseId, status }),
            });
            if (!response.ok) {
                throw new Error(`Error updating course status: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (updateCourseStatus):", error);
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

    async getRecursos(filters: { tipo?: string; ciclo?: number; codigo_curso?: string; search?: string } = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.tipo && filters.tipo !== 'all') params.append('tipo', filters.tipo);
            if (filters.ciclo) params.append('ciclo', filters.ciclo.toString());
            if (filters.codigo_curso) params.append('codigo_curso', filters.codigo_curso);
            if (filters.search) params.append('search', filters.search);

            const response = await fetchWithAuth(`${API_URL}/recursos?${params.toString()}`);
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
