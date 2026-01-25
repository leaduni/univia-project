/**
 * API Service for UniVia Frontend
 * Handles all communication with the FastAPI backend
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export const apiService = {
    /**
     * Fetch the curriculum map (Malla Curricular)
     */
    async getMalla() {
        try {
            const response = await fetch(`${API_URL}/malla-curricular`);
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
     * Fetch dashboard statistics
     */
    async getDashboardStats() {
        try {
            const response = await fetch(`${API_URL}/dashboard/stats`);
            if (!response.ok) {
                throw new Error(`Error fetching stats: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getDashboardStats):", error);
            throw error;
        }
    },

    /**
     * Fetch course details by ID
     */
    async getCourse(id: string | number) {
        try {
            const response = await fetch(`${API_URL}/cursos/${id}`);
            if (!response.ok) {
                throw new Error(`Error fetching course ${id}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (getCourse ${id}):`, error);
            throw error;
        }
    },

    /**
     * Fetch complete learning path for a course
     */
    async getLearningPath(courseId: string | number) {
        try {
            const response = await fetch(`${API_URL}/curso/${courseId}/learning-path`);
            if (!response.ok) {
                throw new Error(`Error fetching learning path for ${courseId}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (getLearningPath ${courseId}):`, error);
            throw error;
        }
    },

    /**
     * Fetch resources with filters
     */
    async getRecursos(filters: { tipo?: string; ciclo?: number; codigo_curso?: string; search?: string } = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.tipo && filters.tipo !== 'all') params.append('tipo', filters.tipo);
            if (filters.ciclo) params.append('ciclo', filters.ciclo.toString());
            if (filters.codigo_curso) params.append('codigo_curso', filters.codigo_curso);
            if (filters.search) params.append('search', filters.search);

            const response = await fetch(`${API_URL}/recursos?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Error fetching recursos: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getRecursos):", error);
            throw error;
        }
    },

    /**
     * Authenticate user
     */
    async login(credentials: { email: string; password: string }) {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Login failed: ${response.statusText}`);
            }
            const data = await response.json();
            // Store user info in localStorage for demo purposes
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
            }
            return data;
        } catch (error) {
            console.error("API Error (login):", error);
            throw error;
        }
    },

    /**
     * Fetch current user profile
     */
    async getProfile() {
        try {
            // First check if we have a user in localStorage
            if (typeof window !== 'undefined') {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    // Refresh from API to get latest data
                    const user = JSON.parse(storedUser);
                    // In a real app, we would use the token here
                }
            }

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const response = await fetch(`${API_URL}/usuarios/me`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                throw new Error(`Error fetching profile: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Error (getProfile):", error);
            throw error;
        }
    }
};
