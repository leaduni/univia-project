
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string | { contexto: string };
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const textToRender = typeof content === 'object' && content !== null && 'contexto' in content ? content.contexto : content;

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
      <div className={`prose dark:prose-invert ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {String(textToRender)}
        </ReactMarkdown>
      </div>
    </>
  );
};

export default MarkdownRenderer;
