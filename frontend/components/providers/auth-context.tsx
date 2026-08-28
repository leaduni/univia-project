// Auth context provider with Supabase session management
"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiService } from '@/lib/api-service';
import { User, Session } from '@supabase/supabase-js';

// Single-flight del perfil: una petición en vuelo se reutiliza en vez de
// duplicarse (p. ej. INITIAL_SESSION y SIGNED_IN seguidos). Vive fuera del
// componente para sobrevivir a los re-renders del provider.
let perfilEnVuelo: Promise<void> | null = null;

// Segundos que se espera a que Supabase restaure la sesión antes de liberar la
// pantalla de carga por nuestra cuenta.
const TIMEOUT_SESION_MS = 8000;

// El navegador en modo privado, o con el almacenamiento restringido o lleno,
// hace que setItem/removeItem lancen. El localStorage aquí es solo un caché de
// respaldo, así que un fallo al escribirlo no debe cortar el flujo de auth.
const guardarLocal = (clave: string, valor: string) => {
    try {
        localStorage.setItem(clave, valor);
    } catch (error) {
        console.warn(`No se pudo guardar "${clave}" en localStorage.`, error);
    }
};

const borrarLocal = (clave: string) => {
    try {
        localStorage.removeItem(clave);
    } catch {
        // Si no se puede leer ni escribir, tampoco hay nada que limpiar.
    }
};

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

    // Token cuyo perfil ya se pidió al backend. Supabase re-emite eventos de
    // auth cada vez que la pestaña recupera el foco; sin esta marca se volvería
    // a pedir el perfil (y a recargar las pantallas que dependen de la sesión)
    // en cada cambio de pestaña del navegador.
    const tokenPerfilCargado = useRef<string | null>(null);

    // Solo reemplaza la sesión cuando cambia el token. Guardar el objeto nuevo
    // que manda Supabase en cada evento cambiaría su identidad y re-dispararía
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
        if (perfilEnVuelo) return perfilEnVuelo;
        perfilEnVuelo = (async () => {
            try {
                const profile = await apiService.getProfile(token);
                setUser(profile);
                if (typeof window !== 'undefined') {
                    guardarLocal('user', JSON.stringify(profile));
                    guardarLocal('token', token);
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
            } finally {
                perfilEnVuelo = null;
            }
        })();
        return perfilEnVuelo;
    };

    useEffect(() => {
        // Red de seguridad. `isLoading` se libera desde onAuthStateChange, así
        // que si getSession() se cuelga, el evento no llega o fetchProfile se
        // queda esperando a la red, la pantalla se congela en "Cargando tu
        // sesión..." para siempre. Pasado el límite se libera la carga y la app
        // sigue: las rutas protegidas redirigen al login por sí solas.
        let temporizadorSesion: ReturnType<typeof setTimeout> | null = setTimeout(() => {
            temporizadorSesion = null;
            console.warn(
                `La restauración de sesión no respondió en ${TIMEOUT_SESION_MS} ms; se libera la pantalla de carga.`
            );
            setIsLoading(false);
        }, TIMEOUT_SESION_MS);

        const cancelarTemporizador = () => {
            if (temporizadorSesion) {
                clearTimeout(temporizadorSesion);
                temporizadorSesion = null;
            }
        };

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                guardarSesion(session);
                // No llamamos a fetchProfile aquí porque onAuthStateChange
                // disparará el evento INITIAL_SESSION inmediatamente después.
                // El temporizador sigue vivo a propósito: quien libera la carga
                // es ese evento, y también puede no llegar.
            } else {
                cancelarTemporizador();
                setIsLoading(false);
            }
        }).catch((error) => {
            // Sin esto un fallo de getSession() deja isLoading en true.
            console.error("Error al restaurar la sesión:", error);
            cancelarTemporizador();
            setIsLoading(false);
        });

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            guardarSesion(session);

            if (session) {
                // TOKEN_REFRESHED solo renueva el token (al volver a la
                // pestaña o tras expirar): el perfil ya está cargado y no
                // debe re-pedirse a la red.
                if (event !== "TOKEN_REFRESHED") {
                    await fetchProfile(session.access_token);
                }
            } else {
                tokenPerfilCargado.current = null;
                setUser(null);
                if (typeof window !== 'undefined') {
                    borrarLocal('user');
                    borrarLocal('token');
                }
            }
            cancelarTemporizador();
            setIsLoading(false);
        });

        return () => {
            cancelarTemporizador();
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        tokenPerfilCargado.current = null;
        setSession(null);
        setSupabaseUser(null);
        setUser(null);

        if (typeof window !== 'undefined') {
            borrarLocal('user');
            borrarLocal('token');
        }

        await supabase.auth.signOut();

        // Al cerrar sesión se vuelve a la portada pública (/).
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
