// Auth context provider with Supabase session management
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiService } from '@/lib/api-service';
import { User, Session } from '@supabase/supabase-js';

// Single-flight del perfil: una petici├│n en vuelo se reutiliza en vez de
// duplicarse (p. ej. INITIAL_SESSION y SIGNED_IN seguidos). Vive fuera del
// componente para sobrevivir a los re-renders del provider.
let perfilEnVuelo: Promise<void> | null = null;

interface AuthContextType {
    user: any | null;
    supabaseUser: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (token: string) => {
        if (perfilEnVuelo) return perfilEnVuelo;
        perfilEnVuelo = (async () => {
            try {
                const profile = await apiService.getProfile(token);
                setUser(profile);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(profile));
                    localStorage.setItem('token', token);
                }
            } catch (error: any) {
                // Si el error es de red (backend no disponible), lo logueamos
                // pero NO cerramos la sesi├│n de Supabase
                const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
                if (isNetworkError) {
                    console.warn("Backend no disponible en este momento. El usuario de Supabase sigue autenticado.");
                    // Intentar cargar perfil cacheado del localStorage
                    if (typeof window !== 'undefined') {
                        const cached = localStorage.getItem('user');
                        if (cached) {
                            try { setUser(JSON.parse(cached)); } catch { setUser(null); }
                            return;
                        }
                    }
                } else {
                    console.error("Error fetching user profile:", error);
                }
                setUser(null);
            } finally {
                perfilEnVuelo = null;
            }
        })();
        return perfilEnVuelo;
    };

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSession(session);
                setSupabaseUser(session.user);
                // No llamamos a fetchProfile aqu├¡ porque onAuthStateChange 
                // disparar├í el evento INITIAL_SESSION inmediatamente despu├®s.
            } else {
                setIsLoading(false);
            }
        });

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth State Change:", event, !!session);

            setSession(session);
            setSupabaseUser(session?.user ?? null);

            if (session) {
                // TOKEN_REFRESHED solo renueva el token (al volver a la
                // pesta├▒a o tras expirar): el perfil ya est├í cargado y no
                // debe re-pedirse a la red.
                if (event !== "TOKEN_REFRESHED") {
                    await fetchProfile(session.access_token);
                }
            } else {
                setUser(null);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            }
            setIsLoading(false);  // Siempre se ejecuta
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        setSession(null);
        setSupabaseUser(null);
        setUser(null);

        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }

        await supabase.auth.signOut();

        // Al cerrar sesi├│n se vuelve a la portada p├║blica (/).
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.assign('/');
        }
    };

    const refreshProfile = async () => {
        if (session) {
            await fetchProfile(session.access_token);
        }
    };

    return (
        <AuthContext.Provider value={{ user, supabaseUser, session, isLoading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
