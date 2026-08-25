"use client";

import { useState } from "react";

import { Hoverable } from "./hoverable";
import { COURSES, DASH_NAV } from "./landing-data";
import { useCountUp, useDemoFit } from "./use-landing-fx";

const CANVAS = { width: 760, height: 475, flexShrink: 0, transformOrigin: "top left" } as const;

export function PlatformSection() {
  const fit = useDemoFit();
  const { k, ref: countRef } = useCountUp();
  const [navIdx, setNavIdx] = useState(0);

  const stats = [
    { label: "Cursos completados", nota: "de 42 en plan", valor: String(Math.round(18 * k)), color: "#67c765", icon: "ph-check-circle" },
    { label: "Avance de carrera", nota: "96/220 crs", valor: Math.round(46 * k) + "%", color: "#b5abfc", icon: "ph-trend-up" },
    { label: "Cursos activos", nota: "este ciclo", valor: String(Math.round(5 * k)), color: "#7cb8e4", icon: "ph-book-open" },
    { label: "Evaluaciones rendidas", nota: "27 ok", valor: String(Math.round(32 * k)), color: "#f0b269", icon: "ph-file-text" },
  ];

  const dashCourses = COURSES.slice(0, 2).map((c) => ({
    ...c,
    bar: (c.progreso * k).toFixed(1) + "%",
    pct: Math.round(c.progreso * k) + "%",
  }));

  return (
    <section
      id="plataforma"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(80px, 9vw, 132px) clamp(20px, 4vw, 64px)",
        backgroundImage: "linear-gradient(160deg, #221a54 0%, #171445 48%, #0d1038 100%)",
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
            "radial-gradient(circle 520px at 8% 6%, rgba(121, 87, 241, 0.28), transparent 70%), radial-gradient(circle 420px at 92% 78%, rgba(48, 84, 214, 0.24), transparent 72%)",
        }}
      />
      <div
        className="univia-split"
        style={{
          position: "relative",
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.75fr 1fr",
          columnGap: "clamp(36px, 6vw, 92px)",
          rowGap: "clamp(32px, 5vw, 56px)",
        }}
      >
        <h2
          data-reveal="up"
          style={{
            gridColumn: 1,
            margin: 0,
            maxWidth: "15ch",
            fontSize: "clamp(34px, 5.2vw, 68px)",
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            color: "#ffffff",
            textWrap: "balance",
          }}
        >
          La plataforma de estudiantes UNI número 1 del mercado
        </h2>
        <div
          data-reveal="up"
          data-reveal-delay="140"
          ref={fit}
          style={{
            gridColumn: 1,
            position: "relative",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(215, 206, 247, 0.16)",
            boxShadow: "0 30px 80px rgba(3, 12, 64, 0.55)",
            aspectRatio: "16 / 10",
          }}
        >
          <div ref={countRef} style={{ ...CANVAS, display: "flex", background: "#161826", color: "#e9e9ed", fontSize: 12, overflow: "hidden" }}>
            {/* Sidebar */}
            <div
              style={{
                width: 152,
                flexShrink: 0,
                borderRight: "1px solid rgba(63, 66, 77, 0.5)",
                display: "flex",
                flexDirection: "column",
                padding: "12px 10px",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 6px 12px",
                  borderBottom: "1px solid rgba(63, 66, 77, 0.35)",
                  marginBottom: 6,
                }}
              >
                <span style={{ width: 20, height: 20, borderRadius: 6, backgroundImage: "linear-gradient(135deg, #d93340, #7957f1)" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>UniVia</span>
              </div>
              {DASH_NAV.map((item, i) => {
                const on = i === navIdx;
                return (
                  <div
                    key={item.label}
                    onClick={() => setNavIdx(i)}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      background: on ? "rgba(121, 87, 241, 0.16)" : "transparent",
                      border: "1px solid " + (on ? "rgba(121, 87, 241, 0.45)" : "transparent"),
                      color: on ? "#ffffff" : "rgba(233, 233, 237, 0.65)",
                      transition: "background 200ms ease, color 200ms ease",
                    }}
                  >
                    <i className={"ph " + item.icon} style={{ fontSize: 15 }} />
                    {item.label}
                  </div>
                );
              })}
              <span style={{ marginTop: "auto", fontSize: 9, letterSpacing: "0.08em", color: "rgba(233, 233, 237, 0.35)" }}>
                UniVia · v1.0.0
              </span>
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, minWidth: 0, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>Hola, Diego 👋</span>
                  <span style={{ fontSize: 11, color: "rgba(233, 233, 237, 0.55)" }}>
                    Llevas <b style={{ color: "#d2cefd" }}>{Math.round(12 * k)} días</b> de racha estudiando.
                  </span>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(63, 66, 77, 0.9)",
                    fontSize: 10.5,
                    color: "rgba(233, 233, 237, 0.6)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#67c765",
                      animation: "univiaPulseDot 1.8s ease-in-out infinite",
                    }}
                  />
                  Sincronizado
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {stats.map((m) => (
                  <Hoverable
                    key={m.label}
                    style={{
                      background: "rgba(35, 37, 50, 0.85)",
                      border: "1px solid rgba(63, 66, 77, 0.6)",
                      borderRadius: 11,
                      padding: "9px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      transition: "border-color 200ms ease",
                    }}
                    hoverStyle={{ borderColor: "rgba(121, 87, 241, 0.6)" }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 10,
                        color: "rgba(233, 233, 237, 0.55)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <i className={"ph " + m.icon} style={{ fontSize: 12, color: m.color }} />
                      {m.label}
                    </span>
                    <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
                      <b style={{ fontSize: 19, fontWeight: 700, color: "#ffffff" }}>{m.valor}</b>
                      <span style={{ fontSize: 9.5, color: "rgba(233, 233, 237, 0.4)" }}>{m.nota}</span>
                    </span>
                  </Hoverable>
                ))}
              </div>

              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "11px 13px",
                  borderRadius: 12,
                  border: "1px solid rgba(121, 87, 241, 0.45)",
                  background: "rgba(121, 87, 241, 0.1)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "linear-gradient(100deg, transparent 20%, rgba(215, 206, 247, 0.14) 45%, transparent 70%)",
                    backgroundSize: "220% 100%",
                    animation: "univiaSheen 3.6s linear infinite",
                  }}
                />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    borderRadius: 9,
                    backgroundImage: "linear-gradient(135deg, #a6249d, #7957f1)",
                    color: "#ffffff",
                    fontSize: 15,
                  }}
                >
                  <i className="ph ph-sparkle" />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#ffffff" }}>Recomendación de tu asistente IA</span>
                  <span style={{ fontSize: 10.5, color: "rgba(233, 233, 237, 0.6)" }}>
                    Refuerza <b style={{ color: "#d2cefd" }}>Regla de la cadena</b> antes del parcial: 3 de tus últimas fallas vienen
                    de ahí.
                  </span>
                </div>
                <Hoverable
                  as="span"
                  style={{
                    marginLeft: "auto",
                    flexShrink: 0,
                    padding: "6px 11px",
                    borderRadius: 8,
                    border: "1px solid rgba(121, 87, 241, 0.7)",
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: "#d7cef7",
                    cursor: "pointer",
                    transition: "background 200ms ease",
                  }}
                  hoverStyle={{ background: "rgba(121, 87, 241, 0.24)", color: "#ffffff" }}
                >
                  Practicar
                </Hoverable>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>Continúa donde te quedaste</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#b5abfc" }}>Ver mi malla →</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, minHeight: 0 }}>
                {dashCourses.map((c) => (
                  <Hoverable
                    key={c.code}
                    style={{
                      borderRadius: 13,
                      overflow: "hidden",
                      background: "rgba(35, 37, 50, 0.95)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "rgba(63, 66, 77, 0.9)",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      transition: "transform 200ms ease, border-color 200ms ease",
                    }}
                    hoverStyle={{ transform: "translateY(-2px)", borderColor: "#7957f1" }}
                  >
                    <div
                      style={{
                        position: "relative",
                        height: 62,
                        padding: "9px 11px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        overflow: "hidden",
                        background: c.grad,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundImage: "radial-gradient(circle at 78% 18%, rgba(255,255,255,0.3), transparent 58%)",
                        }}
                      />
                      <i
                        className={"ph " + c.icon}
                        aria-hidden="true"
                        style={{ position: "absolute", right: 8, bottom: -6, fontSize: 44, color: "rgba(255, 255, 255, 0.22)" }}
                      />
                      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255, 255, 255, 0.9)" }}>
                          {c.code}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: "rgba(20, 22, 35, 0.6)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            fontSize: 9.5,
                            color: "#ffffff",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "#34d399",
                              animation: "univiaPulseDot 1.6s ease-in-out infinite",
                            }}
                          />
                          En curso
                        </span>
                      </div>
                      <span style={{ position: "relative", fontSize: 12.5, fontWeight: 600, color: "#ffffff" }}>{c.name}</span>
                    </div>
                    <div style={{ padding: "9px 11px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(233, 233, 237, 0.45)" }}>
                        {c.ciclo}
                        <span>{c.credits} créditos</span>
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          color: "rgba(233, 233, 237, 0.7)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Sigue: {c.next}
                      </span>
                      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(233, 233, 237, 0.5)" }}>
                        {c.done} de {c.total} temas
                        <b style={{ color: "#ffffff" }}>{c.pct}</b>
                      </span>
                      <span style={{ display: "block", height: 5, borderRadius: 999, background: "#2e3142", overflow: "hidden" }}>
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            borderRadius: 999,
                            backgroundImage: "linear-gradient(90deg, #a6249d, #7957f1)",
                            transition: "width 220ms linear",
                            width: c.bar,
                          }}
                        />
                      </span>
                    </div>
                  </Hoverable>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            gridColumn: 2,
            gridRow: 2,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(28px, 4vw, 44px)",
            alignSelf: "start",
          }}
        >
          <p
            data-reveal="up"
            data-reveal-delay="220"
            style={{ margin: 0, fontSize: "clamp(18px, 1.9vw, 24px)", fontWeight: 500, lineHeight: 1.45, color: "#ffffff", textWrap: "pretty" }}
          >
            Univia reúne a <span style={{ color: "#b9a9ff" }}>más de 8,000 estudiantes</span> de las 12 facultades de la UNI en un solo
            espacio de estudio.
          </p>
          <div data-reveal="up" data-reveal-delay="300" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(215, 206, 247, 0.55)",
              }}
            >
              Incluye
            </span>
            {[
              "Material por curso y ciclo",
              "Bancos de exámenes verificados",
              "Comunidad por especialidad",
              "Acceso libre con correo UNI",
            ].map((t) => (
              <span key={t} style={{ fontSize: 16, fontWeight: 500, color: "#f8fafc" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
