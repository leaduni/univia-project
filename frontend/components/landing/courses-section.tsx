"use client";

import { useEffect, useRef, useState } from "react";

import { Hoverable } from "./hoverable";
import { COURSES } from "./landing-data";
import { useCountUp, useDemoFit } from "./use-landing-fx";

export function CoursesSection() {
  const fit = useDemoFit();
  const { k, ref: countRef } = useCountUp();
  const [sel, setSel] = useState(0);
  const pause = useRef(0);

  /* Rota entre cursos solo mientras el usuario no esté interactuando. */
  useEffect(() => {
    const id = setInterval(() => {
      if (pause.current > Date.now()) return;
      setSel((s) => (s + 1) % COURSES.length);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const cur = COURSES[sel];
  const hechos = Math.round(cur.temas.length * 0.6 * k);
  const curPct = Math.round(cur.progreso * k) + "%";

  return (
    <section
      id="cursos"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(80px, 9vw, 132px) clamp(20px, 4vw, 64px)",
        backgroundImage: "linear-gradient(200deg, #4a0f24 0%, #3a0d22 46%, #260a2b 100%)",
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
            "radial-gradient(circle 500px at 92% 8%, rgba(217, 51, 64, 0.3), transparent 70%), radial-gradient(circle 440px at 6% 84%, rgba(166, 36, 157, 0.32), transparent 72%)",
        }}
      />
      <div
        className="univia-split"
        style={{
          position: "relative",
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1.75fr",
          columnGap: "clamp(36px, 6vw, 92px)",
          rowGap: "clamp(32px, 5vw, 56px)",
        }}
      >
        <h2
          data-reveal="up"
          style={{
            gridColumn: 2,
            margin: 0,
            maxWidth: "16ch",
            marginLeft: "auto",
            textAlign: "right",
            fontSize: "clamp(34px, 5.2vw, 68px)",
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            color: "#ffffff",
            textWrap: "balance",
          }}
        >
          Todos tus cursos, tus planchas, y tu progreso, aquí
        </h2>

        <div
          data-reveal="up"
          data-reveal-delay="140"
          ref={fit}
          style={{
            gridColumn: 2,
            gridRow: 2,
            position: "relative",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(255, 214, 230, 0.16)",
            boxShadow: "0 30px 80px rgba(38, 6, 20, 0.6)",
            aspectRatio: "16 / 10",
          }}
        >
          <div
            ref={countRef}
            style={{
              width: 760,
              height: 475,
              flexShrink: 0,
              transformOrigin: "top left",
              display: "flex",
              flexDirection: "column",
              background: "#161826",
              color: "#e9e9ed",
              fontSize: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "11px 16px",
                borderBottom: "1px solid rgba(63, 66, 77, 0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, backgroundImage: "linear-gradient(135deg, #d93340, #7957f1)" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>Mis cursos</span>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "rgba(121, 87, 241, 0.16)",
                    border: "1px solid rgba(121, 87, 241, 0.4)",
                    fontSize: 10,
                    color: "#d7cef7",
                  }}
                >
                  Ciclo 2026-1
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "rgba(233, 233, 237, 0.5)" }}>
                <i className="ph ph-magnifying-glass" style={{ fontSize: 13 }} />
                Buscar curso o plancha
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 12, padding: "13px 16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, minHeight: 0 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(233, 233, 237, 0.4)" }}>
                  Elige un curso
                </span>
                {COURSES.map((c, i) => {
                  const on = i === sel;
                  return (
                    <Hoverable
                      key={c.code}
                      onClick={() => {
                        pause.current = Date.now() + 14000;
                        setSel(i);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 11px",
                        borderRadius: 12,
                        cursor: "pointer",
                        background: on ? "rgba(121, 87, 241, 0.14)" : "rgba(35, 37, 50, 0.9)",
                        border: "1px solid " + (on ? "#7957f1" : "rgba(63, 66, 77, 0.9)"),
                        transition: "background 220ms ease, border-color 220ms ease, transform 220ms ease",
                      }}
                      hoverStyle={{ transform: "translateX(2px)" }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          borderRadius: 9,
                          fontSize: 15,
                          color: "#ffffff",
                          background: c.grad,
                        }}
                      >
                        <i className={"ph " + c.icon} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <b style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>{c.name}</b>
                          <span style={{ fontSize: 9.5, color: "rgba(233, 233, 237, 0.45)" }}>{c.code}</span>
                        </span>
                        <span style={{ display: "block", height: 5, borderRadius: 999, background: "#2e3142", overflow: "hidden" }}>
                          <span
                            style={{
                              display: "block",
                              height: "100%",
                              borderRadius: 999,
                              backgroundImage: "linear-gradient(90deg, #a6249d, #7957f1)",
                              transition: "width 220ms linear",
                              width: (c.progreso * k).toFixed(1) + "%",
                            }}
                          />
                        </span>
                        <span style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "rgba(233, 233, 237, 0.45)" }}>
                          {c.ciclo} · {c.credits} créditos
                          <b style={{ color: "#ffffff" }}>{Math.round(c.progreso * k)}%</b>
                        </span>
                      </div>
                    </Hoverable>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: 12,
                  borderRadius: 13,
                  background: "rgba(35, 37, 50, 0.85)",
                  border: "1px solid rgba(63, 66, 77, 0.7)",
                  minHeight: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#ffffff" }}>{cur.name}</span>
                    <span style={{ fontSize: 10, color: "rgba(233, 233, 237, 0.5)" }}>
                      Ruta de aprendizaje · {cur.done} de {cur.total} temas
                    </span>
                  </div>
                  <span
                    style={{
                      padding: "4px 9px",
                      borderRadius: 8,
                      background: "rgba(103, 199, 101, 0.14)",
                      border: "1px solid rgba(103, 199, 101, 0.4)",
                      fontSize: 10,
                      color: "#86e08a",
                    }}
                  >
                    {curPct}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {cur.temas.map((t, i) => {
                    const done = i < hechos;
                    return (
                      <Hoverable
                        key={t}
                        as="span"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 9px",
                          borderRadius: 9,
                          background: "rgba(22, 24, 38, 0.7)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "rgba(63, 66, 77, 0.5)",
                          fontSize: 11,
                          color: "rgba(233, 233, 237, 0.85)",
                          transition: "border-color 240ms ease",
                        }}
                        hoverStyle={{ borderColor: "rgba(121, 87, 241, 0.6)" }}
                      >
                        <i
                          className={"ph " + (done ? "ph-check-circle" : "ph-circle-dashed")}
                          style={{ fontSize: 14, color: done ? "#67c765" : "rgba(233, 233, 237, 0.4)" }}
                        />
                        {t}
                      </Hoverable>
                    );
                  })}
                </div>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 10px",
                      borderRadius: 9,
                      backgroundImage: "linear-gradient(135deg, #a6249d, #7957f1)",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <i className="ph ph-play" style={{ fontSize: 12 }} />
                    Continuar tema
                  </span>
                  <Hoverable
                    as="span"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 10px",
                      borderRadius: 9,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "rgba(63, 66, 77, 0.9)",
                      fontSize: 11,
                      color: "rgba(233, 233, 237, 0.75)",
                      cursor: "pointer",
                      transition: "border-color 200ms ease",
                    }}
                    hoverStyle={{ borderColor: "#7957f1" }}
                  >
                    <i className="ph ph-paperclip" style={{ fontSize: 12 }} />
                    Planchas
                  </Hoverable>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            gridColumn: 1,
            gridRow: 2,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(28px, 4vw, 44px)",
            alignSelf: "start",
            textAlign: "right",
          }}
        >
          <p
            data-reveal="up"
            data-reveal-delay="220"
            style={{ margin: 0, fontSize: "clamp(18px, 1.9vw, 24px)", fontWeight: 500, lineHeight: 1.45, color: "#ffffff", textWrap: "pretty" }}
          >
            Organiza tus planchas, prácticas y notas por ciclo, y mira <span style={{ color: "#ff9ec4" }}>cuánto avanzaste</span> sin abrir
            una sola carpeta más.
          </p>
          <div data-reveal="up" data-reveal-delay="300" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255, 214, 230, 0.6)",
              }}
            >
              Tu espacio
            </span>
            {[
              "Planchas resueltas y guardadas",
              "Seguimiento de notas por curso",
              "Historial de ciclos anteriores",
              "Recordatorios de entregas",
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
