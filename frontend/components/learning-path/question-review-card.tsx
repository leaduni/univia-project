import React, { useState } from "react";
import type { QuestionDetail } from "@/types/evaluation";
import { BookOpen, Sparkles } from "lucide-react";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

interface QuestionReviewCardProps {
  question: QuestionDetail;
  index: number;
}

const sanitizarTextoAcademico = (text?: string): string => {
  if (!text) return "";

  // Decodificar ÚNICAMENTE escapes \uXXXX literales.
  // El balance de $ y el envolvimiento de comandos LaTeX sueltos lo garantiza
  // el backend (sanitize_latex_string en evaluaciones.py). No agregar parches
  // defensivos de $ aquí: pueden re-balancear incorrectamente lo que el
  // backend ya dejó sano.
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
};

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  question,
  index,
}) => {
  const [showFull, setShowFull] = useState(false);
  const isCorrect = question.isCorrect;
  const hasExplanation = Boolean(question.explanation && question.explanation.trim().length > 5);

  return (
    <div className="p-4 rounded-xl bg-[#131424] border border-[#1E2030] space-y-3 hover:border-[#2A2D42] transition-colors">
      <div className="flex items-center gap-3">
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            isCorrect
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-rose-500/20 text-rose-400"
          }`}
        >
          {isCorrect ? "\u2713" : "\u2715"}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm leading-snug">
            P{question.questionNumber}.
          </h4>
          <div className="mt-0.5 text-xs text-gray-200">
            <MarkdownRenderer content={sanitizarTextoAcademico(question.questionText)} />
          </div>
        </div>
        {question.origen === "compendio" ? (
          <span
            title={question.fuente_detalle || "Examen pasado"}
            className="flex-shrink-0 inline-flex items-center gap-1 bg-purple-950/60 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full text-[10px] font-medium"
          >
            <BookOpen className="w-3 h-3" />
            Examen
          </span>
        ) : (
          <span className="flex-shrink-0 inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
            <Sparkles className="w-3 h-3 text-amber-400" />
            IA
          </span>
        )}
      </div>

      <div className="pl-9 text-xs text-gray-300 leading-relaxed">
        <strong className="text-gray-400">Respuesta correcta:</strong>{" "}
        <span className="text-gray-200">
          <MarkdownRenderer content={sanitizarTextoAcademico(question.correctAnswer)} />
        </span>
      </div>

      {hasExplanation && (
        <div className="pl-9">
          <button
            onClick={() => setShowFull(!showFull)}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            {showFull ? "Ocultar soluci\u00f3n paso a paso" : "Ver soluci\u00f3n paso a paso"}
          </button>
          {showFull && (
            <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-xl my-3 space-y-3">
              <h5 className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Solución Paso a Paso
              </h5>
              <div className="text-sm text-gray-200 leading-relaxed">
                <MarkdownRenderer content={sanitizarTextoAcademico(question.explanation)} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};