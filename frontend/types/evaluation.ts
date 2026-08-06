export interface QuestionDetail {
  id: string | number;
  questionNumber: number;
  questionText: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  questionType?: string;
  options?: string[];
  contextoMarkdown?: string;
  inputMarkdown?: string;
  outputMarkdown?: string;
  origen?: string;
  fuente_detalle?: string;
}

export interface FeedbackData {
  rawRetroalimentacion: string;
}

export interface EvaluationResultData {
  score: number;
  totalQuestions: number;
  percentage: number;
  topic: string;
  feedback: FeedbackData;
  questions: QuestionDetail[];
}
