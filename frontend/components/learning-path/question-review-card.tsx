import React, { useState } from "react";
import type { QuestionDetail } from "@/types/evaluation";

interface QuestionReviewCardProps {
  question: QuestionDetail;
  index: number;
}

const cleanLatex = (str: string): string =>
  str.replace(/\\[a-z]+(?:\{[^}]*\})?/g, "").replace(/\s+/g, " ").trim();

const truncateExplanation = (text: string, maxChars: number = 200): string => {
  const cleaned = cleanLatex(text);
  if (cleaned.length <= maxChars) return cleaned;
  const firstSentence = cleaned.match(/^.*?[.!?](?:\s|$)/);
  return firstSentence ? firstSentence[0] : cleaned.slice(0, maxChars).split(" ").slice(0, -1).join(" ") + "...";
};

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  question,
  index,
}) => {
  const [showFull, setShowFull] = useState(false);
  const isCorrect = question.isCorrect;
  const hasLongExplanation = question.explanation && question.explanation.length > 200;
  const shortSummary = question.explanation ? truncateExplanation(question.explanation) : "";

  return (
    <div className="p-4 rounded-xl bg-[#131424] border border-[#1E2030] space-y-2 hover:border-[#2A2D42] transition-colors">
      <div className="flex items-center gap-3">
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            isCorrect
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-rose-500/20 text-rose-400"
          }`}
        >
          {isCorrect ? "✓" : "✕"}
        </span>
        <h4 className="font-semibold text-white text-sm leading-snug">
          P{question.questionNumber}. {cleanLatex(question.questionText)}
        </h4>
      </div>

      <p className="text-xs text-gray-300 pl-9 leading-relaxed">
        <strong className="text-gray-400">Respuesta correcta:</strong>{" "}
        &laquo;{cleanLatex(question.correctAnswer)}&raquo;.
        {shortSummary && ` ${shortSummary}`}
      </p>

      {hasLongExplanation && (
        <div className="pl-9">
          <button
            onClick={() => setShowFull(!showFull)}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            {showFull ? "Ocultar soluci\u00f3n paso a paso" : "Ver soluci\u00f3n paso a paso"}
          </button>
          {showFull && (
            <div className="mt-2 text-xs text-gray-400 leading-relaxed">
              {question.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
