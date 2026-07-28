import React from "react";

interface ScoreGaugeCircleProps {
  score: number;
  total: number;
  percentage: number;
}

export const ScoreGaugeCircle: React.FC<ScoreGaugeCircleProps> = ({
  score,
  total,
  percentage,
}) => {
  const aprobado = percentage >= 60;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  const title = aprobado ? "¡Excelente trabajo! 🎉" : "A seguir practicando 📚";
  const subtitle = `Acertaste ${score} de ${total} preguntas.`;

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width="200"
          height="200"
          viewBox="0 0 120 120"
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient
              id="score-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#1E2030"
            strokeWidth="10"
          />

          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#score-gradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-0">
          <span className="text-5xl font-extrabold text-white tracking-tight">
            {score}
          </span>
          <span className="text-sm text-gray-400 mt-0.5">
            de {total}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>
    </div>
  );
};
