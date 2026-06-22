
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
                throw new Error(`Error fetching learning path for ${courseId}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (getLearningPath ${courseId}):`, error);
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
        cursos_completados: number[];
        matricula_actual: number[];
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

    async login(credentials: { email: string; password: string }) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });

            if (error) throw error;
            if (!data.session) throw new Error("No session created after login");

            console.log("Login successful, fetching profile...");

            const profile = await this.getProfile(data.session.access_token);

            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(profile));
                localStorage.setItem('token', data.session.access_token);
            }

            return {
                user: profile,
                token: data.session.access_token,
                supabaseUser: data.user
            };
        } catch (error: any) {
            console.error("Supabase Auth Error (login):", error);
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

    async signup(data: { email: string; password: string; fullName: string; rol?: string }) {
        
        console.log("Chequeo de URL: '" + process.env.NEXT_PUBLIC_SUPABASE_URL + "'");
        console.log("Longitud de la Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
        
        try {
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        nombre_completo: data.fullName,
                        rol: data.rol || 'estudiante'
                    }
                }
            });

            if (error) throw error;
            return authData;
        } catch (error: any) {
            console.error("Supabase Auth Error (signup):", error);
            throw new Error(error.message || "Signup failed");
        }
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out:", error);
    }
};
