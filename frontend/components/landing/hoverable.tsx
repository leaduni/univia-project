"use client";

import { createElement, useState, type CSSProperties, type ReactNode } from "react";

type HoverableProps = {
  as?: "div" | "span" | "a" | "b" | "i";
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
};

/* Equivalente a style-hover del mockup: aplica estilos inline extra en hover. */
export function Hoverable({ as = "div", style, hoverStyle, children, ...rest }: HoverableProps) {
  const [on, setOn] = useState(false);
  return createElement(
    as,
    {
      ...rest,
      style: on ? { ...style, ...hoverStyle } : style,
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
