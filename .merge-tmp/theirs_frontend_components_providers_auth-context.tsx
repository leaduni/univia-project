// Auth context provider with Supabase session management
"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiService } from '@/lib/api-service';
import { User, Session } from '@supabase/supabase-js';

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

    // Token cuyo perfil ya se pidi├│ al backend. Supabase re-emite eventos de
    // auth cada vez que la pesta├▒a recupera el foco; sin esta marca se volver├¡a
    // a pedir el perfil (y a recargar las pantallas que dependen de la sesi├│n)
    // en cada cambio de pesta├▒a del navegador.
    const tokenPerfilCargado = useRef<string | null>(null);

    // Solo reemplaza la sesi├│n cuando cambia el token. Guardar el objeto nuevo
    // que manda Supabase en cada evento cambiar├¡a su identidad y re-disparar├¡a
    // todos los useEffect que dependen de `session`.
    const guardarSesion = (nueva: Session | null) => {
        setSession((previa) => {
            if (previa?.access_token === nueva?.access_token) return previa;
            return nueva;
        });
        setSupabaseUser((previo) => {
            const nuevoUsuario = nueva?.user ?? null;
            if (previo?.id === nuevoUsuario?.id) return previo;
            return nuevoUsuario;
        });
    };

    const fetchProfile = async (token: string) => {
        tokenPerfilCargado.current = token;
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
        }
    };

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                guardarSesion(session);
                // No llamamos a fetchProfile aqu├¡ porque onAuthStateChange
                // disparar├í el evento INITIAL_SESSION inmediatamente despu├®s.
            } else {
                setIsLoading(false);
            }
        });

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            guardarSesion(session);

            if (session) {
                // Al volver de otra pesta├▒a Supabase reemite SIGNED_IN/TOKEN_REFRESHED
                // con el mismo token: el perfil ya est├í en memoria y volver a
                // pedirlo solo har├¡a parpadear las pantallas.
                if (tokenPerfilCargado.current !== session.access_token) {
                    await fetchProfile(session.access_token);
                }
            } else {
                tokenPerfilCargado.current = null;
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
        tokenPerfilCargado.current = null;
        setSession(null);
        setSupabaseUser(null);
        setUser(null);

        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }

        await supabase.auth.signOut();
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
