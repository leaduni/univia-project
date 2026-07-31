// UI primitive: markdown rendering component

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// @ts-expect-error KaTeX CSS import for styling
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string | { contexto: string };
  className?: string;
}

const sanitizeLatex = (text: string): string => {
  if (!text) return "";
  let str = text;

  // 1. Reemplazar triples/cuádruples $$$, $$$$ por doble dólar $$
  str = str.replace(/\$\$\$+/g, "$$");

  // 2. Insertar espacio entre texto y comandos LaTeX pegados: "Halle\vec{QS}" → "Halle \vec{QS}"
  str = str.replace(/([a-zA-Z0-9)])\\(?=[a-zA-Z])/g, "$1 \\");

  // 3. Limpiar saltos de línea dentro de bloques $...$ (no afecta a $$...$$)
  str = str.replace(/\$([^$\n]+(?:\n[^$\n]*)*)\$/g, (_, inner) => '$' + inner.replace(/\n/g, ' ') + '$');

  // 4. Balancear signos $: si hay un número impar, cerrar con $ al final
  //    para evitar que KaTeX interprete el resto del texto como matemáticas
  const dollarCount = (str.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    str += "$";
  }

  return str;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const raw = typeof content === 'object' && content !== null && 'contexto' in content ? content.contexto : content;
  const textToRender = sanitizeLatex(String(raw));

  return (
    <>
      <style jsx global>{`
        .katex {
          color: inherit; /* Inherit color from parent */
        }
        .dark .katex {
          color: inherit; /* Inherit color from parent in dark mode */
        }
      `}</style>
      <div className="overflow-x-auto max-w-full my-1 py-1 scrollbar-thin break-words whitespace-normal text-slate-100">
        <div className={`prose dark:prose-invert ${className}`}>
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {textToRender}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
};

export default MarkdownRenderer;
