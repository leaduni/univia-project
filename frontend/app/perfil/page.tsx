"use client"

import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/components/providers/auth-context";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useState, useEffect } from "react";
import { apiService } from "@/lib/api-service";

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recordatorios, setRecordatorios] = useState(true);
  const [recomendaciones, setRecomendaciones] = useState(true);
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getProfile();
        setUser(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Cargando perfil...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>No se pudo cargar el perfil.</p>
        </div>
      </DashboardLayout>
    );
  }

  const estudiante = user?.estudiante || {};
  const facultad = user?.estudiante?.facultad?.nombre
    ?? user?.estudiante?.carrera?.facultad
    ?? "FIIS";

  const profile = {
    name: user.nombre_completo || "Usuario",
    email: user.email || "",
    code: estudiante.codigo_estudiante || "S/C",
    carrera: estudiante.carrera?.nombre || "No asignada",
    facultad,
    ciclo: estudiante.ciclo || "III",
    racha: estudiante.racha_dias ?? 0,
    creditos: `${estudiante.creditos_aprobados ?? 0} / ${estudiante.creditos_totales ?? 182}`,
    plan: estudiante.plan ?? "2023",
    avatar: user.foto_url || "",
    inicial: (user.nombre_completo || "U").charAt(0),
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-8 p-4 md:p-8">

        {/* Hero Card */}
        <div className="bg-[#14132a]/90 border border-[#27244a] p-6 lg:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#a855f7] to-[#ec4899] p-0.5 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <div className="w-full h-full bg-[#14132a] rounded-full flex items-center justify-center text-2xl font-black text-white">
                {profile.inicial}
              </div>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {profile.name}
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                {profile.email} &middot; C&oacute;digo {profile.code}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#211d45] text-purple-300 border border-[#3b3475]">
                  {profile.carrera}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1a233d] text-sky-300 border border-[#283b66]">
                  Ciclo {profile.ciclo}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#331c2b] text-amber-300 border border-[#592a47] flex items-center gap-1">
                  &#x1F525; Racha {profile.racha} d&iacute;as
                </span>
              </div>
            </div>
          </div>
          <button className="px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] hover:border-[#ec4899] transition-all shadow-md">
            Editar perfil
          </button>
        </div>

        {/* Two-Column Grid */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Left: Academic Info */}
          <div className="bg-[#14132a]/80 border border-[#27244a] p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Informaci&oacute;n acad&eacute;mica
            </h2>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-[#232042]">
                <span className="text-slate-400">Carrera</span>
                <span className="font-medium text-white">{profile.carrera}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#232042]">
                <span className="text-slate-400">Facultad</span>
                <span className="font-medium text-white">{profile.facultad}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#232042]">
                <span className="text-slate-400">Ciclo actual</span>
                <span className="font-medium text-white">{profile.ciclo}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#232042]">
                <span className="text-slate-400">Cr&eacute;ditos aprobados</span>
                <span className="font-medium text-white">{profile.creditos}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">Plan de estudios</span>
                <span className="font-medium text-white">{profile.plan}</span>
              </div>
            </div>
          </div>

          {/* Right: Gestión + Preferencias */}
          <div className="bg-[#14132a]/80 border border-[#27244a] p-6 rounded-3xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Gesti&oacute;n Acad&eacute;mica</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                &iquest;Cambiaste de ciclo o aprobaste nuevos cursos? Actualiza tu malla para recalcular tu ruta de aprendizaje.
              </p>
              <button
                onClick={() => router.push("/onboarding")}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#ec4899] to-[#a855f7] hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/20"
              >
                Actualizar Situaci&oacute;n Acad&eacute;mica
              </button>
            </div>
            <div className="border-t border-[#232042] pt-6">
              <h2 className="text-lg font-bold text-white mb-4">Preferencias</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Recordatorios de estudio</p>
                    <p className="text-xs text-slate-400">Aviso diario para mantener tu racha</p>
                  </div>
                  <input
                    type="checkbox"
                    className="accent-[#ec4899] w-5 h-5 rounded"
                    checked={recordatorios}
                    onChange={(e) => setRecordatorios(e.target.checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Recomendaciones de IA</p>
                    <p className="text-xs text-slate-400">Sugerencias seg&uacute;n tu desempe&ntilde;o</p>
                  </div>
                  <input
                    type="checkbox"
                    className="accent-[#ec4899] w-5 h-5 rounded"
                    checked={recomendaciones}
                    onChange={(e) => setRecomendaciones(e.target.checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="mt-8">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesi&oacute;n</span>
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
