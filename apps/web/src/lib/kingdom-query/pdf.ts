import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  Archetype,
  ScoringProfile,
  SubProfile,
  Survey,
  SurveyResponse,
} from "./types";

/** Creator-facing results summary PDF: overview stats, archetype distribution, trait averages. */
export function buildResultsSummaryPdf(params: {
  survey: Survey;
  responses: SurveyResponse[];
  archetypes: Archetype[];
  scoringProfiles: ScoringProfile[];
}): jsPDF {
  const { survey, responses, archetypes, scoringProfiles } = params;
  const doc = new jsPDF();
  const completed = responses.filter((r) => r.status === "completed");

  doc.setFontSize(18);
  doc.text(survey.title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Results summary • generated ${new Date().toLocaleString()}`, 14, 25);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 32,
    head: [["Metric", "Value"]],
    body: [
      ["Total responses", String(responses.length)],
      ["Completed", String(completed.length)],
      [
        "Completion rate",
        responses.length ? `${Math.round((completed.length / responses.length) * 100)}%` : "0%",
      ],
      ["Opted in", String(responses.filter((r) => r.opted_in).length)],
    ],
  });

  let nextY = getFinalY(doc, 60);

  if (archetypes.length > 0) {
    const counts = new Map<string, number>();
    for (const r of completed) {
      if (!r.archetype_id) continue;
      counts.set(r.archetype_id, (counts.get(r.archetype_id) ?? 0) + 1);
    }
    doc.setFontSize(13);
    doc.text("Archetype distribution", 14, nextY);
    autoTable(doc, {
      startY: nextY + 4,
      head: [["Archetype", "Responses"]],
      body: archetypes.map((a) => [a.label || a.key, String(counts.get(a.id) ?? 0)]),
    });
    nextY = getFinalY(doc, nextY + 20);
  }

  if (scoringProfiles.length > 0 && completed.length > 0) {
    doc.setFontSize(13);
    doc.text("Average trait scores", 14, nextY);
    autoTable(doc, {
      startY: nextY + 4,
      head: [["Trait", "Average score"]],
      body: scoringProfiles.map((p) => {
        const values = completed.map((r) => r.scores?.[p.key] ?? 0);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return [p.label || p.key, avg.toFixed(2)];
      }),
    });
  }

  return doc;
}

/** Respondent-facing "your result" PDF, shown right after they finish a survey. */
export function buildRespondentResultPdf(params: {
  survey: Survey;
  archetype: Archetype | null;
  subProfile: SubProfile | null;
  scores: Record<string, number>;
  scoringProfiles: ScoringProfile[];
}): jsPDF {
  const { survey, archetype, subProfile, scores, scoringProfiles } = params;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(survey.title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Your results • ${new Date().toLocaleDateString()}`, 14, 25);
  doc.setTextColor(0);

  let y = 38;
  if (archetype) {
    doc.setFontSize(16);
    doc.text(archetype.result_title || archetype.label, 14, y);
    y += 8;
    if (archetype.result_body) {
      const lines = doc.splitTextToSize(archetype.result_body, 180);
      doc.setFontSize(11);
      doc.text(lines, 14, y);
      y += lines.length * 6 + 4;
    }
  }
  if (subProfile) {
    doc.setFontSize(14);
    doc.text(subProfile.result_title || subProfile.label, 14, y);
    y += 7;
    if (subProfile.result_body) {
      const lines = doc.splitTextToSize(subProfile.result_body, 180);
      doc.setFontSize(11);
      doc.text(lines, 14, y);
      y += lines.length * 6 + 4;
    }
  }

  if (scoringProfiles.length > 0) {
    autoTable(doc, {
      startY: y + 4,
      head: [["Trait", "Score"]],
      body: scoringProfiles.map((p) => [p.label || p.key, String(scores[p.key] ?? 0)]),
    });
  }

  return doc;
}

function getFinalY(doc: jsPDF, fallback: number): number {
  const withAutoTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return (withAutoTable.lastAutoTable?.finalY ?? fallback - 10) + 12;
}
