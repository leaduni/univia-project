// Auth context provider with Supabase session management
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
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

    const fetchProfile = async (token: string) => {
        try {
            const profile = await apiService.getProfile(token);
            setUser(profile);
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(profile));
                localStorage.setItem('token', token);
            }
        } catch (error: any) {
            // Si el error es de red (backend no disponible), lo logueamos
            // pero NO cerramos la sesión de Supabase
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
                setSession(session);
                setSupabaseUser(session.user);
                // No llamamos a fetchProfile aquí porque onAuthStateChange 
                // disparará el evento INITIAL_SESSION inmediatamente después.
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
                await fetchProfile(session.access_token);
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
