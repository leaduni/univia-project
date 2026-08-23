"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Reveal-on-scroll: cada [data-reveal] entra al viewport y se marca .is-in,
   respetando su data-reveal-delay para escalonar. */
export function useReveal() {
  useEffect(() => {
    const pass = () => {
      const vh = window.innerHeight || 800;
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > -80) {
          const d = parseInt(el.dataset.revealDelay || "0", 10);
          el.style.transitionDelay = d / 1000 + "s";
          el.classList.add("is-in");
        }
      });
    };
    window.addEventListener("scroll", pass, { passive: true });
    window.addEventListener("resize", pass);
    const timer = setInterval(pass, 200);
    pass();
    const raf = requestAnimationFrame(pass);
    return () => {
      window.removeEventListener("scroll", pass);
      window.removeEventListener("resize", pass);
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/* Scroll-spy por medición directa: marca en el navbar la sección visible. */
export function useScrollSpy(ids: readonly string[], offset = 76) {
  const [activo, setActivo] = useState(ids[0]);

  useEffect(() => {
    const scan = () => {
      const linea = (window.innerHeight || 800) * 0.35 + offset;
      let next: string | undefined;
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top <= linea && r.bottom > linea) next = id;
      });
      if (next) setActivo((prev) => (next === prev ? prev : next!));
    };
    window.addEventListener("scroll", scan, { passive: true });
    window.addEventListener("resize", scan);
    const timer = setInterval(scan, 200);
    scan();
    return () => {
      window.removeEventListener("scroll", scan);
      window.removeEventListener("resize", scan);
      clearInterval(timer);
    };
  }, [ids, offset]);

  const irA = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      history.replaceState?.(null, "", "#" + id);
      setActivo(id);
    },
    [offset],
  );

  return { activo, irA };
}

/* Rejilla de celdas con auto-glow y estela del cursor, celda por celda. */
export function useGlowGrid(cellSize = 40) {
  const [count, setCount] = useState(600);
  const ref = useRef<HTMLDivElement | null>(null);
  const geo = useRef({ cols: 0, rows: 0, visible: true });
  const hovered = useRef(new Map<number, number>());
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const layout = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const cols = Math.ceil(r.width / cellSize) + 1;
      const rows = Math.ceil(r.height / cellSize) + 1;
      el.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
      el.style.gridAutoRows = cellSize + "px";
      geo.current.cols = cols;
      geo.current.rows = rows;
      setCount((prev) => (prev === cols * rows ? prev : cols * rows));
    };

    const onPointerMove = (e: PointerEvent) => {
      const g = geo.current;
      if (!g.cols) return;
      const r = el.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      const prev = pointer.current || p;
      const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
      const steps = Math.min(60, Math.max(1, Math.ceil(dist / (cellSize * 0.4))));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const col = Math.floor((prev.x + (p.x - prev.x) * t) / cellSize);
        const row = Math.floor((prev.y + (p.y - prev.y) * t) / cellSize);
        if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) continue;
        hovered.current.set(row * g.cols + col, 1);
      }
      pointer.current = p;
    };
    const onPointerLeave = () => {
      pointer.current = null;
    };

    /* Auto glow: celdas aleatorias que encienden y se apagan lento. */
    const pulse = () => {
      if (!geo.current.visible) return;
      const kids = el.children;
      if (!kids.length) return;
      const hues = ["121, 87, 241", "121, 87, 241", "166, 36, 157", "215, 206, 247"];
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const cell = kids[Math.floor(Math.random() * kids.length)] as HTMLElement | undefined;
        if (!cell || cell.dataset.lit === "1") continue;
        const hue = hues[Math.floor(Math.random() * hues.length)];
        const strength = 0.3 + Math.random() * 0.38;
        cell.dataset.lit = "1";
        cell.style.transition = "background 1400ms ease";
        cell.style.background = `rgba(${hue}, ${strength})`;
        setTimeout(
          () => {
            cell.style.transition = "background 2200ms ease";
            cell.style.background = "";
            setTimeout(() => delete cell.dataset.lit, 2200);
          },
          1600 + Math.random() * 1800,
        );
      }
    };

    /* Pintado y decaimiento de la estela. */
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!geo.current.visible || !hovered.current.size) return;
      const glow = Math.round(cellSize * 0.8);
      hovered.current.forEach((v, idx) => {
        const cell = el.children[idx] as HTMLElement | undefined;
        const a = v * 0.9;
        if (!cell || a < 0.02) {
          if (cell) cell.style.boxShadow = "";
          hovered.current.delete(idx);
          return;
        }
        cell.style.boxShadow = `inset 0 0 ${glow}px rgba(121, 87, 241, ${(a * 0.95).toFixed(3)}), inset 0 0 ${Math.round(glow / 2)}px rgba(215, 206, 247, ${(a * 0.35).toFixed(3)}), inset 0 0 0 1px rgba(215, 206, 247, ${(a * 0.85).toFixed(3)})`;
        hovered.current.set(idx, a);
      });
    };

    const vis = new IntersectionObserver((entries) => entries.forEach((en) => (geo.current.visible = en.isIntersecting)), {
      rootMargin: "160px",
    });
    vis.observe(el);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", layout);
    layout();
    const pulseTimer = setInterval(pulse, 900);
    frame = requestAnimationFrame(tick);

    return () => {
      vis.disconnect();
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", layout);
      clearInterval(pulseTimer);
      cancelAnimationFrame(frame);
    };
  }, [cellSize]);

  return { ref, count };
}

/* Las demos se dibujan en un lienzo fijo de 760x475 y se escalan al ancho real
   del marco, así se leen como una captura y nunca se recortan. */
export function useDemoFit() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const apply = (el: HTMLElement) => {
      const canvas = el.firstElementChild as HTMLElement | null;
      if (canvas) canvas.style.transform = "scale(" + el.clientWidth / 760 + ")";
    };
    const ro = new ResizeObserver((entries) => entries.forEach((e) => apply(e.target as HTMLElement)));
    ro.observe(frame);
    apply(frame);
    return () => ro.disconnect();
  }, []);

  return ref;
}

/* Contador 0→1 que arranca cuando la demo entra en pantalla (setInterval y no
   rAF: en pestañas sin pintar el rAF se congela a medias). */
export function useCountUp(duration = 1500) {
  const [k, setK] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    let count: ReturnType<typeof setInterval> | undefined;
    let armed = false;

    const arm = () => {
      if (armed) return;
      armed = true;
      const t0 = Date.now();
      count = setInterval(() => {
        const next = Math.min(1, (Date.now() - t0) / duration);
        setK(next);
        if (next >= 1 && count) clearInterval(count);
      }, 60);
    };

    const io = el
      ? new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && arm(), {
          rootMargin: "0px 0px -10% 0px",
          threshold: 0.15,
        })
      : null;
    if (el && io) io.observe(el);
    // Red de seguridad por si el observer nunca engancha.
    const fallback = setTimeout(arm, 2500);

    return () => {
      io?.disconnect();
      clearTimeout(fallback);
      if (count) clearInterval(count);
    };
  }, [duration]);

  return { k, ref };
}

/* Hover con estilos inline: el mockup usa style-hover, aquí se resuelve con
   estado local por elemento. */
export function useHover() {
  const [on, setOn] = useState(false);
  return {
    on,
    bind: {
      onMouseEnter: () => setOn(true),
      onMouseLeave: () => setOn(false),
    },
  };
}
