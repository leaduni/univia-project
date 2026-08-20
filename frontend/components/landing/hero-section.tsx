"use client";

import { Hoverable } from "./hoverable";
import { AUTH_ROUTES } from "./landing-data";
import { useGlowGrid } from "./use-landing-fx";

const STARS_A =
  "radial-gradient(1.6px 1.6px at 12% 18%, rgba(255,255,255,0.9), transparent 60%), radial-gradient(1.4px 1.4px at 27% 62%, rgba(215,206,247,0.85), transparent 60%), radial-gradient(1.8px 1.8px at 41% 9%, rgba(255,255,255,0.75), transparent 60%), radial-gradient(1.2px 1.2px at 55% 78%, rgba(215,206,247,0.8), transparent 60%), radial-gradient(1.6px 1.6px at 68% 33%, rgba(255,255,255,0.85), transparent 60%), radial-gradient(1.3px 1.3px at 82% 66%, rgba(215,206,247,0.75), transparent 60%), radial-gradient(1.7px 1.7px at 91% 21%, rgba(255,255,255,0.8), transparent 60%), radial-gradient(1.2px 1.2px at 7% 84%, rgba(215,206,247,0.7), transparent 60%), radial-gradient(1.5px 1.5px at 34% 40%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(1.3px 1.3px at 61% 52%, rgba(215,206,247,0.7), transparent 60%)";

const STARS_B =
  "radial-gradient(1.1px 1.1px at 19% 47%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(1.3px 1.3px at 46% 27%, rgba(166,36,157,0.85), transparent 60%), radial-gradient(1.1px 1.1px at 73% 88%, rgba(255,255,255,0.6), transparent 60%), radial-gradient(1.4px 1.4px at 88% 45%, rgba(121,87,241,0.9), transparent 60%), radial-gradient(1.1px 1.1px at 3% 33%, rgba(255,255,255,0.65), transparent 60%), radial-gradient(1.2px 1.2px at 52% 95%, rgba(215,206,247,0.7), transparent 60%), radial-gradient(1.3px 1.3px at 30% 74%, rgba(121,87,241,0.8), transparent 60%), radial-gradient(1.1px 1.1px at 96% 79%, rgba(255,255,255,0.6), transparent 60%)";

export function HeroSection({ ctaLabel = "Empieza a aprender" }: { ctaLabel?: string }) {
  const grid = useGlowGrid(40);

  return (
    <section
      id="inicio"
      style={{
        position: "relative",
        minHeight: "calc(100vh - 76px)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -40,
          zIndex: 0,
          pointerEvents: "none",
          animation: "univiaTwinkleA 5.5s ease-in-out infinite, univiaDrift 34s linear infinite alternate",
          backgroundImage: STARS_A,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -40,
          zIndex: 0,
          pointerEvents: "none",
          animation: "univiaTwinkleB 7.5s ease-in-out infinite, univiaDrift 46s linear infinite alternate-reverse",
          backgroundImage: STARS_B,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(circle 320px at 18% 24%, rgba(121, 87, 241, 0.16), transparent 70%), radial-gradient(circle 260px at 82% 72%, rgba(166, 36, 157, 0.14), transparent 70%), radial-gradient(circle 220px at 68% 12%, rgba(217, 51, 64, 0.1), transparent 70%)",
          filter: "blur(6px)",
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
              borderRight: "1px solid rgba(215, 206, 247, 0.17)",
              borderBottom: "1px solid rgba(215, 206, 247, 0.17)",
              transition: "background 900ms ease",
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 78% 68% at 50% 46%, rgba(11, 12, 22, 0.12) 0%, rgba(11, 12, 22, 0.42) 55%, rgba(11, 12, 22, 0.78) 88%, #0b0c16 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 40% 34% at 50% 44%, rgba(121, 87, 241, 0.22) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <img
          data-reveal="scale"
          data-reveal-delay="60"
          src="/Logo_LEAD_UNI.png"
          alt="LEAD UNI"
          style={{
            width: "clamp(96px, 11vw, 148px)",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 8px 40px rgba(217, 51, 64, 0.45))",
          }}
        />
        <h1
          data-reveal="up"
          data-reveal-delay="200"
          style={{
            margin: 0,
            fontSize: "clamp(60px, 13vw, 168px)",
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: "0.03em",
            backgroundImage: "linear-gradient(120deg, #d93340 0%, #a6249d 48%, #7957f1 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 6px 34px rgba(121, 87, 241, 0.35))",
          }}
        >
          UNIVIA
        </h1>
        <p
          data-reveal="up"
          data-reveal-delay="340"
          style={{
            margin: 0,
            maxWidth: 620,
            fontSize: "clamp(15px, 1.5vw, 19px)",
            fontWeight: 400,
            lineHeight: 1.55,
            color: "rgba(215, 206, 247, 0.82)",
            textWrap: "pretty",
          }}
        >
          Todos tus cursos de la UNI en un solo lugar, con evaluaciones generadas por IA para reforzar lo que aprendes y ver tu
          progreso ciclo a ciclo.
        </p>
        <div
          data-reveal="up"
          data-reveal-delay="470"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginTop: 10,
            pointerEvents: "auto",
          }}
        >
          <Hoverable
            as="a"
            href={AUTH_ROUTES.signup}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              height: 52,
              padding: "0 28px",
              borderRadius: 9,
              fontSize: 16,
              fontWeight: 500,
              color: "#ffffff",
              backgroundImage: "linear-gradient(135deg, #d93340, #a6249d, #7957f1)",
              boxShadow: "0 8px 30px rgba(121, 87, 241, 0.35)",
              transition: "box-shadow 220ms ease, transform 220ms ease",
            }}
            hoverStyle={{ boxShadow: "0 12px 40px rgba(121, 87, 241, 0.5)", transform: "translateY(-1px)", color: "#ffffff" }}
          >
            {ctaLabel}
            <i className="ph ph-arrow-right" style={{ fontSize: 18 }} />
          </Hoverable>
          <Hoverable
            as="a"
            href="#plataforma"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 52,
              padding: "0 24px",
              borderRadius: 9,
              border: "1px solid rgba(215, 206, 247, 0.3)",
              fontSize: 16,
              fontWeight: 400,
              color: "#d7cef7",
              transition: "background 200ms ease, border-color 200ms ease",
            }}
            hoverStyle={{ background: "rgba(121, 87, 241, 0.14)", borderColor: "#7957f1", color: "#ffffff" }}
          >
            Conoce el proyecto
          </Hoverable>
        </div>
      </div>
    </section>
  );
}

export function QuoteSection() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(88px, 12vw, 160px) clamp(20px, 4vw, 64px)",
        backgroundImage: "linear-gradient(135deg, #a6249d 0%, #7957f1 55%, #d93340 100%)",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(circle 460px at 14% 12%, rgba(255, 255, 255, 0.22), transparent 70%), radial-gradient(circle 420px at 88% 84%, rgba(217, 51, 64, 0.35), transparent 72%), radial-gradient(circle 340px at 82% 8%, rgba(255, 134, 255, 0.28), transparent 70%), radial-gradient(circle 300px at 10% 90%, rgba(121, 87, 241, 0.4), transparent 72%)",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "clamp(24px, 5vw, 56px)",
          left: "clamp(24px, 6vw, 80px)",
          fontSize: "clamp(90px, 12vw, 160px)",
          fontWeight: 700,
          lineHeight: 1,
          color: "rgba(255, 255, 255, 0.18)",
          userSelect: "none",
        }}
      >
        “
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "clamp(-4px, 0vw, 6px)",
          right: "clamp(24px, 6vw, 80px)",
          fontSize: "clamp(90px, 12vw, 160px)",
          fontWeight: 700,
          lineHeight: 1,
          color: "rgba(255, 255, 255, 0.18)",
          userSelect: "none",
          transform: "rotate(180deg)",
        }}
      >
        “
      </span>
      <div
        style={{
          position: "relative",
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
          textAlign: "center",
        }}
      >
        <p
          data-reveal="up"
          style={{
            margin: 0,
            fontSize: "clamp(24px, 3.4vw, 42px)",
            fontWeight: 700,
            lineHeight: 1.35,
            color: "#ffffff",
            textWrap: "balance",
            textShadow: "0 8px 40px rgba(3, 12, 64, 0.35)",
          }}
        >
          No aprendes a caminar siguiendo reglas. Aprendes haciendo y cayéndote.
        </p>
        <span aria-hidden="true" style={{ display: "block", width: 56, height: 2, background: "rgba(255, 255, 255, 0.55)", borderRadius: 2 }} />
        <span
          data-reveal="up"
          data-reveal-delay="120"
          style={{ fontSize: "clamp(15px, 1.6vw, 18px)", fontWeight: 400, fontStyle: "italic", color: "rgba(255, 255, 255, 0.85)" }}
        >
          Richard Branson
        </span>
      </div>
    </section>
  );
}
