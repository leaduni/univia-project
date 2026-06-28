"use client"

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/stats-cards";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

import { useState, useEffect } from "react";
import { apiService } from "@/lib/api-service";

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const profile = {
    name: user.nombre_completo || "Usuario",
    email: user.email || "",
    faculty: user.estudiante?.carrera?.nombre || "No asignada",
    code: user.estudiante?.codigo_estudiante || "S/C",
    avatar: user.foto_url || "/placeholder-user.jpg",
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar} alt={profile.name} />
            <AvatarFallback>
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {profile.name}
            </h1>
            <p className="text-muted-foreground">{profile.faculty}</p>
          </div>
        </div>

        <StatsCards stats={user?.estudiante?.estadisticas || {}} isLoading={isLoading} />

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Tus datos personales y de contacto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre</span>
                <span className="font-medium">{profile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Correo Institucional
                </span>
                <span className="font-medium">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facultad</span>
                <span className="font-medium">{profile.faculty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Código UNI</span>
                <span className="font-medium">{profile.code}</span>
              </div>

            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Gestión Académica</CardTitle>
              <CardDescription>
                Mantén tu información académica siempre al día.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start space-y-4">
              <p className="text-sm text-muted-foreground">
                ¿Cambiaste de ciclo o aprobaste nuevos cursos? Actualiza tu
                malla aquí para recalcular tu ruta de aprendizaje.
              </p>
              <Link href="/onboarding" passHref>
                <Button>Actualizar Situación Académica</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
