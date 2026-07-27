import React from "react";
import { parseAIFeedback } from "@/lib/feedbackAdapter";

interface RetroalimentacionCardProps {
  rawRetroalimentacion: string;
}

export const RetroalimentacionCard: React.FC<RetroalimentacionCardProps> = ({
  rawRetroalimentacion,
}) => {
  const feedback = parseAIFeedback(rawRetroalimentacion);

  return (
    <div className="w-full rounded-2xl bg-[#131424] border border-[#1E2030] p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-rose-500 text-lg">&loz;</span>
        <h3 className="font-bold text-white text-base">
          Retroalimentaci&oacute;n de tu asistente IA
        </h3>
      </div>

      {feedback.summary && (
        <p className="text-sm text-gray-300 leading-relaxed bg-[#181A2E] p-4 rounded-xl border border-[#23263B]">
          {feedback.summary}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className="bg-[#181A2E] p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-start space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <span className="text-base">&#128077;</span>
            <h4>Fortalezas</h4>
          </div>
          <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
            {feedback.strengths.length > 0 ? (
              feedback.strengths.map((item, idx) => (
                <li key={idx} className="leading-normal">{item}</li>
              ))
            ) : (
              <li className="text-gray-500 italic list-none">
                Identificando puntos fuertes en tu siguiente pr&aacute;ctica...
              </li>
            )}
          </ul>
        </div>

        <div className="bg-[#181A2E] p-4 rounded-xl border border-amber-500/20 flex flex-col justify-start space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <span className="text-base">&#127919;</span>
            <h4>A reforzar</h4>
          </div>
          <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
            {feedback.toImprove.length > 0 ? (
              feedback.toImprove.map((item, idx) => (
                <li key={idx} className="leading-normal">{item}</li>
              ))
            ) : (
              <li className="text-gray-500 italic list-none">
                &iexcl;Excelente! Sin puntos cr&iacute;ticos a reforzar en esta prueba.
              </li>
            )}
          </ul>
        </div>
      </div>

      {feedback.recommendations.length > 0 && (
        <div className="bg-[#181A2E]/60 rounded-xl border border-purple-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm">
            <span className="text-base">&#128218;</span>
            <h4>Recomendaciones de estudio</h4>
          </div>
          <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
            {feedback.recommendations.map((item, idx) => (
              <li key={idx} className="leading-normal">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
