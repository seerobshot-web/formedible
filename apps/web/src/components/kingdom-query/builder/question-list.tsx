"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "./question-card";
import { newId } from "@/lib/kingdom-query/id";
import type { QuestionType, SurveyQuestion } from "@/lib/kingdom-query/types";

interface Props {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
  onDelete: (id: string) => void;
}

function SortableItem({
  question,
  allQuestions,
  onChange,
  onDelete,
}: {
  question: SurveyQuestion;
  allQuestions: SurveyQuestion[];
  onChange: (q: SurveyQuestion) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : undefined}
    >
      <QuestionCard
        question={question}
        allQuestions={allQuestions}
        onChange={onChange}
        onDelete={() => onDelete(question.id)}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

export function QuestionList({ questions, onChange, onDelete }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const sorted = [...questions].sort((a, b) => a.position - b.position);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((q) => q.id === active.id);
    const newIndex = sorted.findIndex((q) => q.id === over.id);
    onChange(arrayMove(sorted, oldIndex, newIndex));
  }

  function updateQuestion(updated: SurveyQuestion) {
    onChange(sorted.map((q) => (q.id === updated.id ? updated : q)));
  }

  function addQuestion(type: QuestionType) {
    const question: SurveyQuestion = {
      id: newId(),
      survey_id: "",
      type,
      title: "",
      description: null,
      required: false,
      position: sorted.length,
      options:
        type === "multiple_choice" || type === "checkboxes"
          ? [
              { id: newId(), label: "Option 1" },
              { id: newId(), label: "Option 2" },
            ]
          : type === "yes_no"
          ? [
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
            ]
          : null,
      logic: [],
    };
    onChange([...sorted, question]);
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((question) => (
            <SortableItem
              key={question.id}
              question={question}
              allQuestions={sorted}
              onChange={updateQuestion}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sorted.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No questions yet. Add your first one below.
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {QUESTION_TYPE_OPTIONS.map(({ type, label }) => (
          <Button key={type} variant="outline" size="sm" onClick={() => addQuestion(type)}>
            <Plus className="size-3.5" /> {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

const QUESTION_TYPE_OPTIONS: { type: QuestionType; label: string }[] = [
  { type: "short_text", label: "Short text" },
  { type: "long_text", label: "Long text" },
  { type: "multiple_choice", label: "Multiple choice" },
  { type: "checkboxes", label: "Checkboxes" },
  { type: "rating", label: "Rating (1-5)" },
  { type: "nps", label: "NPS (0-10)" },
  { type: "email", label: "Email" },
  { type: "yes_no", label: "Yes / No" },
];
