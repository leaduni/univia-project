"use client";

import { Hoverable } from "./hoverable";
import { AUTH_ROUTES, REDES, SECCIONES } from "./landing-data";
import Image from "next/image";
import { useGlowGrid } from "./use-landing-fx";

export function FinalCtaSection() {
  const grid = useGlowGrid(40);

  return (
    <section
      id="signin"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(88px, 11vw, 148px) clamp(20px, 4vw, 64px)",
        backgroundImage: "linear-gradient(180deg, #0b0c16 0%, #10123a 45%, #0d0f2c 100%)",
        isolation: "isolate",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(circle 520px at 50% 8%, rgba(121, 87, 241, 0.22), transparent 70%), radial-gradient(circle 420px at 12% 92%, rgba(166, 36, 157, 0.16), transparent 72%), radial-gradient(circle 380px at 88% 84%, rgba(217, 51, 64, 0.14), transparent 72%)",
        }}
      />
      <div
        ref={grid.ref}
        style={{
          position: "absolute",
          inset: "-1px 0 0 -1px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 40px)",
          gridAutoRows: "40px",
          zIndex: 0,
        }}
      >
        {Array.from({ length: grid.count }, (_, i) => (
          <div
            key={i}
            style={{
              borderRight: "1px solid rgba(215, 206, 247, 0.14)",
              borderBottom: "1px solid rgba(215, 206, 247, 0.14)",
              transition: "background 900ms ease",
            }}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 74% 66% at 50% 50%, rgba(11, 12, 22, 0.1) 0%, rgba(11, 12, 22, 0.5) 58%, rgba(11, 12, 22, 0.86) 88%, #0b0c16 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 760,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          textAlign: "center",
        }}
      >
        <Image
          data-reveal="scale"
          src="/Logo_LEAD_UNI.png"
          alt="LEAD UNI"
          width={118}
          height={118}
          style={{ width: "clamp(84px, 9vw, 118px)", height: "auto", objectFit: "contain", filter: "drop-shadow(0 8px 34px rgba(217, 51, 64, 0.4))" }}
        />
        <h2
          data-reveal="up"
          data-reveal-delay="90"
          style={{
            margin: 0,
            fontSize: "clamp(34px, 5.4vw, 68px)",
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            color: "#ffffff",
            textWrap: "balance",
          }}
        >
          ¿Qué esperas? Comienza tu camino ya.
        </h2>
        <p
          data-reveal="up"
          data-reveal-delay="180"
          style={{
            margin: 0,
            maxWidth: 600,
            fontSize: "clamp(16px, 1.7vw, 20px)",
            lineHeight: 1.6,
            color: "rgba(215, 206, 247, 0.82)",
            textWrap: "pretty",
          }}
        >
          Crea tu cuenta con tu correo UNI, elige tus cursos del ciclo y en menos de cinco minutos tendrás tu primera evaluación generada
          por IA. Es gratis, es de estudiantes para estudiantes.
        </p>
        <div
          data-reveal="up"
          data-reveal-delay="270"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 8 }}
        >
          <Hoverable
            as="a"
            href={AUTH_ROUTES.signup}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              height: 54,
              padding: "0 30px",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 500,
              color: "#ffffff",
              backgroundImage: "linear-gradient(135deg, #d93340, #a6249d, #7957f1)",
              boxShadow: "0 10px 34px rgba(121, 87, 241, 0.42)",
              transition: "transform 200ms ease, box-shadow 200ms ease",
            }}
            hoverStyle={{ transform: "translateY(-2px)", boxShadow: "0 14px 44px rgba(121, 87, 241, 0.55)", color: "#ffffff" }}
          >
            Crear mi cuenta
            <i className="ph ph-arrow-right" style={{ fontSize: 18 }} />
          </Hoverable>
          <Hoverable
            as="a"
            href={AUTH_ROUTES.login}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              height: 54,
              padding: "0 26px",
              borderRadius: 10,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(215, 206, 247, 0.34)",
              fontSize: 16,
              color: "#d7cef7",
              transition: "background 200ms ease, border-color 200ms ease",
            }}
            hoverStyle={{ background: "rgba(121, 87, 241, 0.16)", borderColor: "#7957f1", color: "#ffffff" }}
          >
            <i className="ph ph-sign-in" style={{ fontSize: 18 }} />
            Ya tengo cuenta, iniciar sesión
          </Hoverable>
        </div>
        <span
          data-reveal="up"
          data-reveal-delay="340"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(215, 206, 247, 0.55)" }}
        >
          <i className="ph ph-shield-check" style={{ fontSize: 16 }} />
          Acceso libre con tu correo @uni.pe · Un proyecto de LEAD UNI
        </span>
      </div>
    </section>
  );
}

const LINK_STYLE = {
  fontSize: 14,
  fontWeight: 400,
  color: "rgba(248, 250, 252, 0.82)",
  transition: "color 160ms ease",
} as const;

const SOCIAL_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid rgba(215, 206, 247, 0.35)",
  color: "#d7cef7",
  fontSize: 19,
  transition: "border-color 180ms ease, color 180ms ease, box-shadow 180ms ease",
} as const;

const SOCIAL_HOVER = { borderColor: "#7957f1", color: "#ffffff", boxShadow: "0 0 18px rgba(121, 87, 241, 0.35)" } as const;

export function LandingFooter() {
  return (
    <footer
      style={{
        background: "#030c40",
        borderTop: "1px solid rgba(215, 206, 247, 0.13)",
        padding: "clamp(44px, 6vw, 76px) clamp(20px, 4vw, 64px) 40px",
      }}
    >
      <div
        className="univia-split"
        style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: "clamp(32px, 6vw, 88px)", maxWidth: 1240, margin: "0 auto" }}
      >
        <div data-reveal="up" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff" }}>LEAD UNI</span>
          <Image
            src="/Logo_LEAD_UNI.png"
            alt="LEAD UNI"
            width={96}
            height={96}
            style={{ width: 96, height: "auto", objectFit: "contain", filter: "drop-shadow(0 4px 18px rgba(217, 51, 64, 0.35))" }}
          />
          <span style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.6, color: "rgba(215, 206, 247, 0.55)" }}>
            © 2026 LEAD UNI · Excelencia Académica.
            <br />
            All rights reserved.
          </span>
        </div>

        <div data-reveal="up" data-reveal-delay="110" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(215, 206, 247, 0.5)" }}>
            Secciones
          </span>
          {SECCIONES.filter((s) => s.id !== "inicio").map((s) => (
            <Hoverable key={s.id} as="a" href={"#" + s.id} style={LINK_STYLE} hoverStyle={{ color: "#ffffff" }}>
              {s.label}
            </Hoverable>
          ))}
        </div>

        <div data-reveal="up" data-reveal-delay="220" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(215, 206, 247, 0.5)" }}>
            Plataforma y contacto
          </span>
          <Hoverable as="a" href="#inicio" style={LINK_STYLE} hoverStyle={{ color: "#ffffff" }}>
            Inicio
          </Hoverable>
          <Hoverable as="a" href={AUTH_ROUTES.signup} style={LINK_STYLE} hoverStyle={{ color: "#ffffff" }}>
            Crear cuenta
          </Hoverable>
          <Hoverable as="a" href={AUTH_ROUTES.login} style={LINK_STYLE} hoverStyle={{ color: "#ffffff" }}>
            Iniciar sesión
          </Hoverable>
          <Hoverable as="a" href={"mailto:" + REDES.email} style={LINK_STYLE} hoverStyle={{ color: "#ffffff" }}>
            {REDES.email}
          </Hoverable>
          <span style={{ fontSize: 13, color: "rgba(215, 206, 247, 0.5)" }}>Ciudad Universitaria UNI · Rímac, Lima</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32 }}>
            {[
              { href: REDES.instagram, label: "Instagram", icon: "ph-instagram-logo" },
              { href: REDES.linkedin, label: "LinkedIn", icon: "ph-linkedin-logo" },
              { href: REDES.tiktok, label: "TikTok", icon: "ph-tiktok-logo" },
              { href: REDES.youtube, label: "YouTube", icon: "ph-youtube-logo" },
            ].map((s) => (
              <Hoverable
                key={s.label}
                as="a"
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                style={SOCIAL_STYLE}
                hoverStyle={SOCIAL_HOVER}
              >
                <i className={"ph " + s.icon} />
              </Hoverable>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
