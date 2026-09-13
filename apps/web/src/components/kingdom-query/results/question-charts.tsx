"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { wordFrequency } from "@/lib/kingdom-query/utils";
import type { AnswerValue, SurveyAnswer, SurveyQuestion } from "@/lib/kingdom-query/types";

interface Props {
  questions: SurveyQuestion[];
  answers: SurveyAnswer[];
}

export function QuestionCharts({ questions, answers }: Props) {
  const answersByQuestion = new Map<string, AnswerValue[]>();
  for (const answer of answers) {
    const list = answersByQuestion.get(answer.question_id) ?? [];
    list.push(answer.value);
    answersByQuestion.set(answer.question_id, list);
  }

  const sorted = [...questions].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((question) => {
        const values = answersByQuestion.get(question.id) ?? [];
        if (values.length === 0) return null;
        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-sm">{question.title || "Untitled question"}</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionChart question={question} values={values} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function QuestionChart({ question, values }: { question: SurveyQuestion; values: AnswerValue[] }) {
  if (question.type === "multiple_choice" || question.type === "checkboxes" || question.type === "yes_no") {
    const counts = new Map<string, number>();
    for (const value of values) {
      const ids = Array.isArray(value) ? value : value !== null && value !== undefined ? [String(value)] : [];
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const labelFor = (id: string) => question.options?.find((o) => o.id === id)?.label ?? id;
    const data = Array.from(counts.entries()).map(([id, count]) => ({ name: labelFor(id), count }));
    return <SimpleBarChart data={data} />;
  }

  if (question.type === "rating") {
    const data = [1, 2, 3, 4, 5].map((n) => ({
      name: String(n),
      count: values.filter((v) => v === n).length,
    }));
    return <SimpleBarChart data={data} />;
  }

  if (question.type === "nps") {
    const data = Array.from({ length: 11 }, (_, n) => ({
      name: String(n),
      count: values.filter((v) => v === n).length,
    }));
    return <SimpleBarChart data={data} />;
  }

  // short_text / long_text / email -> word frequency
  const texts = values.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  const freq = wordFrequency(texts);
  if (freq.length === 0) {
    return <p className="text-sm text-muted-foreground">{texts.length} free-text responses.</p>;
  }
  return <SimpleBarChart data={freq.map((f) => ({ name: f.word, count: f.count }))} layout="vertical" />;
}

function SimpleBarChart({
  data,
  layout = "horizontal",
}: {
  data: { name: string; count: number }[];
  layout?: "horizontal" | "vertical";
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout={layout} margin={{ left: layout === "vertical" ? 40 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          {layout === "vertical" ? (
            <>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={100} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
            </>
          )}
          <Tooltip />
          <Bar dataKey="count" fill="var(--color-primary, #4f46e5)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
