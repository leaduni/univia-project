export interface ProcessedFeedback {
  summary: string;
  strengths: string[];
  toImprove: string[];
  recommendations: string[];
}

function splitBullets(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?:\r?\n|;|\. )+/)
    .map((item) => item.trim().replace(/^[-•*]\s*/, ""))
    .filter((item) => item.length > 5);
}

function parseSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionRegex = /(?:##|###|\*\*)\s*(Fortalezas|A reforzar|Debilidades|Siguiente paso|Siguiente Paso|Recomendación)\s*(?:##|###|\*\*)?\s*\n([\s\S]*?)(?=\n(?:##|###|\*\*)|\n*$)/gi;
  let match;
  while ((match = sectionRegex.exec(raw)) !== null) {
    sections[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return sections;
}

export function parseAIFeedback(rawRetroalimentacion: string): ProcessedFeedback {
  if (!rawRetroalimentacion) {
    return { summary: "", strengths: [], toImprove: [], recommendations: [] };
  }

  const summary = rawRetroalimentacion
    .split(/(?:\r?\n){2,}/)[0]
    ?.replace(/^##\s*.*$/gm, "")
    .trim() || "";

  const sections = parseSections(rawRetroalimentacion);
  let strengthsText = sections["fortalezas"] || "";
  let toImproveText = sections["a reforzar"] || sections["debilidades"] || "";
  let rawRecommendations = sections["siguiente paso"] || sections["recomendación"] || "";

  const areaReforzarRegex = /Áreas?\s+específicas?\s+a\s+reforzar\s*:?\s*([\s\S]*?)(?=\n+(?:Recomendaciones?\s+de\s+estudio|##|$))/i;
  const recEstudioRegex = /Recomendaciones?\s+de\s+estudio\s*:?\s*([\s\S]*?)(?=\n+(?:##|###|\*\*)*\s*(?:$|##|###|\*\*))/i;
  const sectionHeaderRegex = /^\s*(?:Áreas?\s+específicas?\s+a\s+reforzar|Recomendaciones?\s+de\s+estudio)\s*:?\s*$/im;

  let extractedToImprove: string[] = [];
  let extractedRecommendations: string[] = [];

  let m;
  m = areaReforzarRegex.exec(strengthsText);
  if (m) {
    extractedToImprove = splitBullets(m[1]);
    strengthsText = strengthsText.replace(areaReforzarRegex, "").trim();
  }
  m = recEstudioRegex.exec(strengthsText);
  if (m) {
    extractedRecommendations = splitBullets(m[1]);
    strengthsText = strengthsText.replace(recEstudioRegex, "").trim();
  }
  strengthsText = strengthsText.replace(sectionHeaderRegex, "").trim();

  m = areaReforzarRegex.exec(toImproveText);
  if (m) {
    extractedToImprove = [...extractedToImprove, ...splitBullets(m[1])];
    toImproveText = toImproveText.replace(areaReforzarRegex, "").trim();
  }
  m = recEstudioRegex.exec(toImproveText);
  if (m) {
    extractedRecommendations = [...extractedRecommendations, ...splitBullets(m[1])];
    toImproveText = toImproveText.replace(recEstudioRegex, "").trim();
  }
  toImproveText = toImproveText.replace(sectionHeaderRegex, "").trim();

  let strengths = splitBullets(strengthsText);
  let toImprove = splitBullets(toImproveText);

  strengths = strengths
    .filter((item) => !/no te desanimes|no te preocupes|excelente trabajo|buen trabajo|sigue así|sigue adelante/i.test(item))
    .slice(0, 3);

  toImprove = [
    ...toImprove.filter((item) => !/se identificaron|no se encontraron|todas fueron correctas/i.test(item)),
    ...extractedToImprove,
  ].slice(0, 4);

  let recommendations = rawRecommendations ? splitBullets(rawRecommendations) : [];
  if (extractedRecommendations.length > 0) {
    recommendations = [...recommendations, ...extractedRecommendations];
  }

  return { summary, strengths, toImprove, recommendations };
}
