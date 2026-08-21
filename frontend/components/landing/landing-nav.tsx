"use client";

import { Hoverable } from "./hoverable";
import { AUTH_ROUTES, SECCIONES } from "./landing-data";
import Image from "next/image";
import { useScrollSpy } from "./use-landing-fx";
import { useAuth } from "../providers/auth-context";

// Definimos IDS aquí para que esté disponible en el ámbito del componente
const IDS = SECCIONES.map((s) => s.id);

export function LandingNav() {
  const { activo, irA } = useScrollSpy(IDS);
  const { session, isLoading } = useAuth();
  // Mientras la sesión se está resolviendo no se pinta el CTA para no mostrar
  // "Log in" por un instante cuando en realidad hay sesión (parpadeo de hidratación).
  const tieneSesion = !isLoading && !!session;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 32,
        height: 76,
        padding: "0 clamp(20px, 4vw, 64px)",
        background: "rgba(3, 12, 64, 0.88)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(215, 206, 247, 0.13)",
      }}
    >
      <a href="#inicio" onClick={irA("inicio")} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Image
          src="/Logo_LEAD_UNI.png"
          alt="LEAD UNI"
          width={38}
          height={38}
          style={{ height: 38, width: "auto", objectFit: "contain", filter: "drop-shadow(0 2px 12px rgba(217, 51, 64, 0.35))" }}
        />
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(24px, 5vw, 56px)" }}>
        <nav
          className="univia-nav-links"
          style={{ display: "flex", alignItems: "center", gap: "clamp(14px, 1.8vw, 30px)", flexWrap: "nowrap" }}
        >
          {SECCIONES.map((n) => {
            const on = activo === n.id;
            return (
              <Hoverable
                key={n.id}
                as="a"
                href={"#" + n.id}
                onClick={irA(n.id)}
                style={{
                  whiteSpace: "nowrap",
                  fontSize: 14.5,
                  letterSpacing: "0.01em",
                  padding: "6px 0",
                  borderBottom: "2px solid transparent",
                  transition: "color 180ms ease, border-color 180ms ease",
                  fontWeight: on ? 500 : 400,
                  color: on ? "#ffffff" : "rgba(215, 206, 247, 0.75)",
                  borderBottomColor: on ? "#7957f1" : "transparent",
                }}
                hoverStyle={{ color: "#ffffff" }}
              >
                {n.label}
              </Hoverable>
            );
          })}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {tieneSesion ? (
            <Hoverable
              as="a"
              href="/dashboard"
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
                padding: "0 22px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "#ffffff",
                backgroundImage: "linear-gradient(135deg, #d93340, #a6249d, #7957f1)",
                boxShadow: "0 4px 18px rgba(121, 87, 241, 0.28)",
                transition: "box-shadow 200ms ease, transform 200ms ease",
              }}
              hoverStyle={{ boxShadow: "0 6px 26px rgba(121, 87, 241, 0.45)", color: "#ffffff" }}
            >
              Ir al Dashboard
            </Hoverable>
          ) : (
            <>
              <Hoverable
                as="a"
                href={AUTH_ROUTES.login}
                style={{
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 40,
                  padding: "0 20px",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "rgba(215, 206, 247, 0.32)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#f8fafc",
                  transition: "background 180ms ease, border-color 180ms ease",
                }}
                hoverStyle={{ background: "rgba(121, 87, 241, 0.14)", borderColor: "#7957f1", color: "#ffffff" }}
              >
                Log in
              </Hoverable>
              <Hoverable
                as="a"
                href={AUTH_ROUTES.signup}
                style={{
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 40,
                  padding: "0 22px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundImage: "linear-gradient(135deg, #d93340, #a6249d, #7957f1)",
                  boxShadow: "0 4px 18px rgba(121, 87, 241, 0.28)",
                  transition: "box-shadow 200ms ease, transform 200ms ease",
                }}
                hoverStyle={{ boxShadow: "0 6px 26px rgba(121, 87, 241, 0.45)", color: "#ffffff" }}
              >
                Sign in
              </Hoverable>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
