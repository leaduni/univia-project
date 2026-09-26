"use client";

import { Github, Linkedin } from "lucide-react";

import { Hoverable, PhotoSlot } from "./hoverable";
import { AUTH_ROUTES, EQUIPO } from "./landing-data";

export function WhyUniviaSection() {
  return (
    <section
      id="nosotros"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(84px, 10vw, 140px) clamp(20px, 4vw, 64px) clamp(72px, 8vw, 112px)",
        backgroundImage: "linear-gradient(150deg, #0d1038 0%, #241a5c 34%, #5c1440 68%, #7d1533 100%)",
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
            "radial-gradient(circle 560px at 12% 4%, rgba(121, 87, 241, 0.34), transparent 70%), radial-gradient(circle 520px at 88% 90%, rgba(217, 51, 64, 0.32), transparent 72%), radial-gradient(circle 380px at 62% 28%, rgba(166, 36, 157, 0.26), transparent 70%)",
        }}
      />
      <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(44px, 6vw, 72px)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
          <h2
            data-reveal="up"
            data-reveal-delay="80"
            style={{
              margin: 0,
              fontSize: "clamp(38px, 5.6vw, 76px)",
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              color: "#ffffff",
              textWrap: "balance",
            }}
          >
            ¿Por qué Univia?
          </h2>
          <p
            data-reveal="up"
            data-reveal-delay="180"
            style={{
              margin: 0,
              fontSize: "clamp(16px, 1.8vw, 21px)",
              fontWeight: 400,
              lineHeight: 1.6,
              color: "rgba(240, 236, 255, 0.86)",
              textWrap: "pretty",
            }}
          >
            Porque nosotros, mejor que nadie, entendemos tu problema. LEAD UNI no es solo una organización: es una familia de estudiantes
            empeñados en seguir aprendiendo y creciendo profesionalmente. Pasamos noches buscando planchas perdidas, exámenes sueltos en
            grupos de WhatsApp y cursos sin material.{" "}
            <b style={{ color: "#ffffff", fontWeight: 600 }}>
              Nosotros ya cruzamos esas dificultades — Univia existe para que tú no tengas que hacerlo.
            </b>
          </p>
          <div
            data-reveal="up"
            data-reveal-delay="260"
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 6 }}
          >
            <Hoverable
              as="a"
              href={AUTH_ROUTES.signup}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                height: 50,
                padding: "0 26px",
                borderRadius: 9,
                fontSize: 15,
                fontWeight: 500,
                color: "#ffffff",
                backgroundImage: "linear-gradient(135deg, #d93340, #a6249d, #7957f1)",
                boxShadow: "0 8px 30px rgba(217, 51, 64, 0.35)",
                transition: "transform 200ms ease, box-shadow 200ms ease",
              }}
              hoverStyle={{ transform: "translateY(-1px)", boxShadow: "0 12px 38px rgba(217, 51, 64, 0.5)", color: "#ffffff" }}
            >
              Únete a la comunidad
              <i className="ph ph-arrow-right" style={{ fontSize: 17 }} />
            </Hoverable>
            <Hoverable
              as="a"
              href="#equipo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 50,
                padding: "0 22px",
                borderRadius: 9,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "rgba(215, 206, 247, 0.32)",
                fontSize: 15,
                color: "#e8e2ff",
                transition: "background 200ms ease, border-color 200ms ease",
              }}
              hoverStyle={{ background: "rgba(215, 206, 247, 0.12)", borderColor: "#d7cef7", color: "#ffffff" }}
            >
              Conoce al equipo
            </Hoverable>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TeamSection() {
  return (
    <section
      id="equipo"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(80px, 9vw, 132px) clamp(20px, 4vw, 64px)",
        backgroundImage: "linear-gradient(160deg, #ece7fd 0%, #ded6fa 58%, #cfc6f6 100%)",
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
            "radial-gradient(circle 480px at 88% 6%, rgba(255, 255, 255, 0.7), transparent 70%), radial-gradient(circle 420px at 8% 88%, rgba(121, 87, 241, 0.14), transparent 72%)",
        }}
      />
      <div style={{ position: "relative", maxWidth: 1140, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(38px, 5vw, 60px)" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <h2
            data-reveal="up"
            style={{
              margin: 0,
              fontSize: "clamp(32px, 4.6vw, 60px)",
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.01em",
              color: "#1b1442",
              textWrap: "balance",
            }}
          >
            Conoce al equipo detrás de UniVia
          </h2>
        </div>
        <div className="univia-team-grid">
          {EQUIPO.map((p) => (
            <Hoverable
              key={p.id}
              className="univia-team-card"
              data-reveal="up"
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 18,
                overflow: "hidden",
                background: "#14152a",
                boxShadow: "0 24px 60px rgba(27, 20, 66, 0.22)",
                transition: "transform 240ms ease, box-shadow 240ms ease",
              }}
              hoverStyle={{ transform: "translateY(-4px)", boxShadow: "0 30px 72px rgba(27, 20, 66, 0.3)" }}
            >
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#1f2138" }}>
                <PhotoSlot src={p.src} alt={`Retrato de ${p.nombre}`} label="Foto del equipo" />
              </div>
              <span aria-hidden="true" style={{ display: "block", height: 4, backgroundImage: "linear-gradient(90deg, #d93340, #a6249d 55%, #7957f1)" }} />
              <div className="univia-team-card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "clamp(19px, 2vw, 23px)", fontWeight: 700, color: "#ffffff" }}>{p.nombre}</span>
                  {"rol" in p && <span style={{ fontSize: 13, fontWeight: 600, color: "#ef5b66" }}>{p.rol}</span>}
                </div>
                <div className="univia-team-socials">
                  <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn de ${p.nombre}`} className="univia-team-social">
                    <Linkedin size={20} aria-hidden="true" />
                  </a>
                  <a href={p.github} target="_blank" rel="noopener noreferrer" aria-label={`GitHub de ${p.nombre}`} className="univia-team-social">
                    <Github size={20} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </Hoverable>
          ))}
        </div>
      </div>
    </section>
  );
}
