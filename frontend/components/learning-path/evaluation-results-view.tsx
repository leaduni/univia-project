import React from "react";
import type { EvaluationResultData } from "@/types/evaluation";
import { ScoreGaugeCircle } from "@/components/learning-path/score-gauge-circle";
import { RetroalimentacionCard } from "@/components/learning-path/retroalimentacion-card";
import { QuestionReviewCard } from "@/components/learning-path/question-review-card";
import { RotateCcw, ArrowLeft } from "lucide-react";

interface EvaluationResultsViewProps {
  data: EvaluationResultData;
  onGenerateNew: () => void;
  onBackToCourse: () => void;
}

export const EvaluationResultsView: React.FC<EvaluationResultsViewProps> = ({
  data,
  onGenerateNew,
  onBackToCourse,
}) => {
  return (
    <div className="min-h-screen bg-[#0B0C14]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-gray-100 font-sans">
        <ScoreGaugeCircle
          score={data.score}
          total={data.totalQuestions}
          percentage={data.percentage}
        />

        <RetroalimentacionCard
          rawRetroalimentacion={data.feedback.rawRetroalimentacion}
        />

        <div>
          <h3 className="text-lg font-bold text-white mb-4">
            Revisi&oacute;n de respuestas
          </h3>
          <div className="space-y-3">
            {data.questions.map((question, idx) => (
              <QuestionReviewCard
                key={question.id}
                question={question}
                index={idx}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center items-center gap-4 pt-6">
          <button
            onClick={onGenerateNew}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 via-purple-600 to-violet-600 text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-purple-950/40 hover:opacity-95 transition-all duration-200 active:scale-[0.99]"
          >
            <RotateCcw className="w-4 h-4" />
            Generar otra pr&aacute;ctica
          </button>
          <button
            onClick={onBackToCourse}
            className="inline-flex items-center gap-2 border border-[#2A2D42] bg-[#161826] text-gray-300 hover:text-white font-medium px-6 py-3 rounded-xl hover:bg-[#1E2030] transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al curso
          </button>
        </div>

        <footer className="flex justify-between items-center text-xs text-gray-500 pt-8 border-t border-[#1E2030]">
          <span>UniVia &middot; un proyecto de LEAD UNI para la comunidad UNI</span>
          <span className="uppercase tracking-widest">LEARN. EXPLORE. ASPIRE. DISCOVER.</span>
        </footer>
      </div>
    </div>
  );
};
