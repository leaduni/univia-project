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

export default function PerfilPage() {
  const user = {
    name: "Juan Pérez",
    email: "juan.perez@alumnos.univia.edu",
    faculty: "Ingeniería de Sistemas e Informática",
    code: "20230123",
    avatar: "/placeholder-user.jpg",
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {user.name}
            </h1>
            <p className="text-muted-foreground">{user.faculty}</p>
          </div>
        </div>

        <StatsCards />

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
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Correo Institucional
                </span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facultad</span>
                <span className="font-medium">{user.faculty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Código UNI</span>
                <span className="font-medium">{user.code}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10">
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
