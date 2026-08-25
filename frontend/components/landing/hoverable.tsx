"use client";

import { createElement, useMemo, useState, type CSSProperties, type ReactNode } from "react";

type HoverableProps = {
  as?: "div" | "span" | "a" | "b" | "i";
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
};

/* Estilos de borde reconocibles dentro de un shorthand (border / borderTop / ...). */
const BORDER_STYLES = new Set([
  "solid",
  "dashed",
  "dotted",
  "double",
  "groove",
  "ridge",
  "inset",
  "outset",
  "none",
  "hidden",
]);

/**
 * Divide un shorthand de borde (`"1px solid rgba(...)"`) en sus longhands.
 * Devuelve null si el valor no es un shorthand reconocible (p. ej. ya es un color).
 */
function splitBorder(value: string): Partial<CSSProperties> | null {
  const tokens = value.trim().split(/\s+/);
  const styleIdx = tokens.findIndex((t) => BORDER_STYLES.has(t));
  if (styleIdx === -1) return null;

  const width = tokens.slice(0, styleIdx).join(" ");
  const color = tokens.slice(styleIdx + 1).join(" ");

  const out: Partial<CSSProperties> = { borderStyle: tokens[styleIdx] as CSSProperties["borderStyle"] };
  if (width) out.borderWidth = width as CSSProperties["borderWidth"];
  if (color) out.borderColor = color as CSSProperties["borderColor"];
  return out;
}

/**
 * Lógica defensiva: si el objeto trae una propiedad resumida de borde (`border`,
 * `borderTop/Right/Bottom/Left`), la desglosa a longhands explícitas. Esto evita
 * que React alternar `borderColor` en hover elimine/regene la clave dinámicamente
 * (warning de reconciliación de estilos).
 */
function expandBorders(style: CSSProperties | undefined): CSSProperties | undefined {
  if (!style) return style;

  const result: CSSProperties = { ...style };

  const expand = (shorthand: string, w: string, s: string, c: string) => {
    const raw = result[shorthand as keyof CSSProperties];
    if (typeof raw !== "string") return;

    const parsed = splitBorder(raw);
    if (!parsed) return;

    if (parsed.borderWidth) (result as Record<string, unknown>)[w] = parsed.borderWidth;
    (result as Record<string, unknown>)[s] = parsed.borderStyle;
    if (parsed.borderColor) (result as Record<string, unknown>)[c] = parsed.borderColor;
    delete result[shorthand as keyof CSSProperties];
  };

  expand("border", "borderWidth", "borderStyle", "borderColor");
  expand("borderTop", "borderTopWidth", "borderTopStyle", "borderTopColor");
  expand("borderRight", "borderRightWidth", "borderRightStyle", "borderRightColor");
  expand("borderBottom", "borderBottomWidth", "borderBottomStyle", "borderBottomColor");
  expand("borderLeft", "borderLeftWidth", "borderLeftStyle", "borderLeftColor");

  return result;
}

/* Equivalente a style-hover del mockup: aplica estilos inline extra en hover. */
export function Hoverable({ as = "div", style, hoverStyle, children, ...rest }: HoverableProps) {
  const [on, setOn] = useState(false);

  // Se normalizan una sola vez (los objetos de estilo son estáticos) para que
  // `borderColor` exista explícitamente en base y no dependa del estado de hover.
  const baseStyle = useMemo(() => expandBorders(style), [style]);
  const mergedHoverStyle = useMemo(() => expandBorders(hoverStyle), [hoverStyle]);

  return createElement(
    as,
    {
      ...rest,
      style: on ? { ...baseStyle, ...mergedHoverStyle } : baseStyle,
      onMouseEnter: () => setOn(true),
      onMouseLeave: () => setOn(false),
    },
    children,
  );
}

/* Marco de foto: usa la imagen si existe, si no un placeholder con el rótulo. */
export function PhotoSlot({ src, alt, label }: { src?: string; alt: string; label: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  return (
    <span
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: 12,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(215, 206, 247, 0.6)",
        backgroundImage:
          "linear-gradient(135deg, rgba(217, 51, 64, 0.28), rgba(166, 36, 157, 0.24) 50%, rgba(121, 87, 241, 0.3))",
      }}
    >
      <i className="ph ph-user" style={{ fontSize: 18 }} />
      {label}
    </span>
  );
}
