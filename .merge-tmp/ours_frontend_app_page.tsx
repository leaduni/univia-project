// Landing page ÔÇö portada p├║blica principal (/)
import { Metadata } from "next";

import { LandingShell } from "@/components/landing/landing-shell";
import "./landing.css";

export const metadata: Metadata = {
  title: "UniVia | Tu camino universitario a tu ritmo",
  description:
    "Todos tus cursos de la UNI en un solo lugar, con evaluaciones generadas por IA para reforzar lo que aprendes y ver tu progreso ciclo a ciclo.",
};

export default function Home() {
  return <LandingShell />;
}
