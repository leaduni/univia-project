"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Hoverable } from "./hoverable";
import { DIFFS, QUIZ, TOPICS } from "./landing-data";
import { useCountUp, useDemoFit } from "./use-landing-fx";

type Phase = "form" | "gen" | "quiz" | "result";

const NEXT: Record<Phase, Phase> = { form: "gen", gen: "quiz", quiz: "result", result: "form" };
const WAIT: Record<Phase, number> = { form: 2600, gen: 1900, quiz: 3400, result: 4600 };

const SCORE_PCT = 80;
const CIRC = 2 * Math.PI * 52;

export function IaSection() {
  const fit = useDemoFit();
  const { k, ref: countRef } = useCountUp();
  const [phase, setPhase] = useState<Phase>("form");
  const [topic, setTopic] = useState(0);
  const [diff, setDiff] = useState(1);
  const [pick, setPick] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const step = useCallback((p: Phase) => {
    clearTimeout(timer.current);
    setPhase(p);
    if (p === "quiz") setPick(null);
    if (p === "form") setTopic((t) => (t + 1) % TOPICS.length);
    timer.current = setTimeout(() => step(NEXT[p]), WAIT[p]);
  }, []);

  useEffect(() => {
    step("form");
    return () => clearTimeout(timer.current);
  }, [step]);

  const quiz = QUIZ[topic];

  return (
    <section
      id="ia"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(80px, 9vw, 132px) clamp(20px, 4vw, 64px)",
        backgroundImage: "linear-gradient(160deg, #ece7fd 0%, #ded6fa 55%, #cfc6f6 100%)",
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
            "radial-gradient(circle 480px at 10% 8%, rgba(255, 255, 255, 0.7), transparent 70%), radial-gradient(circle 420px at 90% 80%, rgba(166, 36, 157, 0.12), transparent 72%)",
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
            maxWidth: "16ch",
            fontSize: "clamp(34px, 5.2vw, 68px)",
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            color: "#1b1442",
            textWrap: "balance",
          }}
        >
          Experimenta con la IA generando tus propias evaluaciones
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
            border: "1px solid rgba(27, 20, 66, 0.14)",
            boxShadow: "0 30px 70px rgba(27, 20, 66, 0.18)",
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
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderBottom: "1px solid rgba(63, 66, 77, 0.5)" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  backgroundImage: "linear-gradient(135deg, #a6249d, #7957f1)",
                  color: "#ffffff",
                  fontSize: 13,
                }}
              >
                <i className="ph ph-sparkle" />
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>Evaluación con IA</span>
              <span style={{ marginLeft: "auto", fontSize: 10.5, color: "rgba(233, 233, 237, 0.45)" }}>Cálculo Diferencial · MB147</span>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 11, padding: "14px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(233, 233, 237, 0.4)" }}>
                  Tema
                </span>
                {TOPICS.map((t, i) => {
                  const on = i === topic;
                  return (
                    <span
                      key={t}
                      onClick={() => setTopic(i)}
                      style={{
                        padding: "6px 11px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 11,
                        background: on ? "rgba(121, 87, 241, 0.22)" : "rgba(22, 24, 38, 0.8)",
                        border: "1px solid " + (on ? "#7957f1" : "rgba(63, 66, 77, 0.9)"),
                        color: on ? "#ffffff" : "rgba(233, 233, 237, 0.6)",
                        transition: "background 200ms ease, color 200ms ease",
                      }}
                    >
                      {t}
                    </span>
                  );
                })}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    marginLeft: "auto",
                    padding: 3,
                    borderRadius: 9,
                    border: "1px solid rgba(63, 66, 77, 0.9)",
                  }}
                >
                  {DIFFS.map((d, i) => {
                    const on = i === diff;
                    return (
                      <span
                        key={d}
                        onClick={() => setDiff(i)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 7,
                          cursor: "pointer",
                          fontSize: 10.5,
                          background: on ? "rgba(166, 36, 157, 0.24)" : "transparent",
                          color: on ? "#ffffff" : "rgba(233, 233, 237, 0.55)",
                          transition: "background 200ms ease, color 200ms ease",
                        }}
                      >
                        {d}
                      </span>
                    );
                  })}
                </span>
              </div>

              {phase === "form" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11, minHeight: 0 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
                    {[
                      ["10", "preguntas"],
                      ["20 min", "duración"],
                      ["Sí", "solucionario"],
                    ].map(([v, l]) => (
                      <span
                        key={l}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          padding: 10,
                          borderRadius: 11,
                          background: "rgba(35, 37, 50, 0.85)",
                          border: "1px solid rgba(63, 66, 77, 0.7)",
                        }}
                      >
                        <b style={{ fontSize: 16, color: "#ffffff" }}>{v}</b>
                        <span style={{ fontSize: 10, color: "rgba(233, 233, 237, 0.5)" }}>{l}</span>
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(233, 233, 237, 0.6)" }}>
                    La IA toma tu material del curso y tus fallas anteriores para redactar preguntas nuevas cada vez.
                  </span>
                  <Hoverable
                    as="span"
                    onClick={() => step("gen")}
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px",
                      borderRadius: 10,
                      backgroundImage: "linear-gradient(135deg, #d93340, #a6249d, #7957f1)",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 6px 20px rgba(121, 87, 241, 0.4)",
                      transition: "transform 200ms ease",
                    }}
                    hoverStyle={{ transform: "translateY(-1px)" }}
                  >
                    <i className="ph ph-magic-wand" style={{ fontSize: 14 }} />
                    Generar evaluación
                  </Hoverable>
                </div>
              )}

              {phase === "gen" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "#ffffff" }}>
                    <i className="ph ph-circle-notch" style={{ fontSize: 15, color: "#b5abfc", animation: "univiaSpin 1s linear infinite" }} />
                    La IA está redactando tus 10 preguntas…
                  </span>
                  {[
                    ["92%", "rgba(121,87,241,0.35)", "0ms"],
                    ["76%", "rgba(166,36,157,0.32)", "160ms"],
                    ["84%", "rgba(121,87,241,0.3)", "320ms"],
                  ].map(([w, c, d]) => (
                    <span
                      key={d}
                      style={{
                        display: "block",
                        height: 13,
                        borderRadius: 7,
                        width: w,
                        backgroundImage: `linear-gradient(100deg, rgba(35,37,50,0.9) 20%, ${c} 45%, rgba(35,37,50,0.9) 70%)`,
                        backgroundSize: "260% 100%",
                        animation: `univiaSheen 1.4s linear infinite ${d}`,
                      }}
                    />
                  ))}
                </div>
              )}

              {phase === "quiz" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 12,
                    minHeight: 0,
                    animation: "univiaFadeUp 420ms ease both",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "rgba(233, 233, 237, 0.45)" }}>
                    Pregunta 4 de 10 · {TOPICS[topic]}
                    <span>08:12</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", lineHeight: 1.4 }}>{quiz.q}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {quiz.opts.map((o, i) => {
                      const bg =
                        pick === null
                          ? "rgba(22, 24, 38, 0.75)"
                          : i === quiz.ok
                            ? "rgba(103, 199, 101, 0.16)"
                            : i === pick
                              ? "rgba(217, 51, 64, 0.16)"
                              : "rgba(22, 24, 38, 0.75)";
                      const bd =
                        pick === null
                          ? "rgba(63, 66, 77, 0.9)"
                          : i === quiz.ok
                            ? "rgba(103, 199, 101, 0.6)"
                            : i === pick
                              ? "rgba(217, 51, 64, 0.6)"
                              : "rgba(63, 66, 77, 0.9)";
                      return (
                        <Hoverable
                          key={o}
                          as="span"
                          onClick={() => {
                            setPick(i);
                            clearTimeout(timer.current);
                            timer.current = setTimeout(() => step("result"), 1300);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 11px",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontSize: 11.5,
                            color: "#e9e9ed",
                            background: bg,
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: bd,
                            transition: "background 220ms ease, border-color 220ms ease",
                          }}
                          hoverStyle={{ borderColor: "#7957f1" }}
                        >
                          <b
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 18,
                              height: 18,
                              flexShrink: 0,
                              borderRadius: 6,
                              background: "rgba(121, 87, 241, 0.22)",
                              fontSize: 10,
                              color: "#d7cef7",
                            }}
                          >
                            {"ABCD"[i]}
                          </b>
                          {o}
                        </Hoverable>
                      );
                    })}
                  </div>
                </div>
              )}

              {phase === "result" && (
                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    alignItems: "center",
                    gap: 18,
                    minHeight: 0,
                    animation: "univiaFadeUp 420ms ease both",
                  }}
                >
                  <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 116, height: 116 }}>
                    <svg width="116" height="116" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                      <defs>
                        <linearGradient id="univiaScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#d93340" />
                          <stop offset="55%" stopColor="#a6249d" />
                          <stop offset="100%" stopColor="#7957f1" />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#1E2030" strokeWidth="10" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="url(#univiaScoreGrad)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={CIRC.toFixed(1)}
                        strokeDashoffset={(CIRC * (1 - (SCORE_PCT / 100) * k)).toFixed(1)}
                      />
                    </svg>
                    <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <b style={{ fontSize: 30, fontWeight: 800, color: "#ffffff" }}>{Math.round(8 * k)}</b>
                      <span style={{ fontSize: 10.5, color: "rgba(233, 233, 237, 0.5)" }}>de 10</span>
                    </span>
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>¡Excelente trabajo! 🎉</span>
                    <span style={{ fontSize: 11, color: "rgba(233, 233, 237, 0.6)" }}>
                      Acertaste 8 de 10 preguntas · {Math.round(SCORE_PCT * k)}%
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "9px 10px",
                        borderRadius: 10,
                        background: "rgba(103, 199, 101, 0.12)",
                        border: "1px solid rgba(103, 199, 101, 0.35)",
                        fontSize: 10.5,
                        color: "rgba(233, 233, 237, 0.85)",
                      }}
                    >
                      <i className="ph ph-trend-up" style={{ fontSize: 13, color: "#86e08a" }} />
                      Fortaleza: dominas la definición de derivada.
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "9px 10px",
                        borderRadius: 10,
                        background: "rgba(240, 178, 105, 0.12)",
                        border: "1px solid rgba(240, 178, 105, 0.35)",
                        fontSize: 10.5,
                        color: "rgba(233, 233, 237, 0.85)",
                      }}
                    >
                      <i className="ph ph-warning-circle" style={{ fontSize: 13, color: "#f0b269" }} />
                      A mejorar: regla de la cadena con raíces. La IA te armó 4 ejercicios.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 2, gridRow: 2, display: "flex", flexDirection: "column", gap: "clamp(28px, 4vw, 44px)", alignSelf: "start" }}>
          <p
            data-reveal="up"
            data-reveal-delay="220"
            style={{ margin: 0, fontSize: "clamp(18px, 1.9vw, 24px)", fontWeight: 500, lineHeight: 1.45, color: "#1b1442", textWrap: "pretty" }}
          >
            Elige un tema, define la dificultad y recibe <span style={{ color: "#7957f1" }}>un examen listo en segundos</span>, con
            retroalimentación paso a paso.
          </p>
          <div data-reveal="up" data-reveal-delay="300" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(27, 20, 66, 0.5)" }}>
              Cómo funciona
            </span>
            {[
              "Preguntas desde tu propio material",
              "Dificultad y formato configurables",
              "Solucionario explicado",
              "Repetición de lo que fallaste",
            ].map((t) => (
              <span key={t} style={{ fontSize: 16, fontWeight: 500, color: "#241a4f" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
