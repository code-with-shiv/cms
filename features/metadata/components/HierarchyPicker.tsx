"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuChevronDown, LuCircleCheck, LuLayers, LuX } from "react-icons/lu";
import {
  getBoards,
  getChapters,
  getGrades,
  getHierarchicalMetadata,
  getLearningUnits,
  getSubjects,
  getTopics,
} from "@/features/metadata/services/metadata.service";
import { getTemplates } from "@/features/templates/services/templates.service";
import type { Template } from "@/types/template";
import type { ChapterOption, HierarchicalChapter, LearningUnitOption, TopicOption } from "@/types/metadata";

type CascadeKey = "questionType" | "board" | "grade" | "subject" | "chapter" | "topic" | "lu";
type CascadeState = Record<CascadeKey, string>;

interface SelectOption {
  label: string;
  value: string;
}

interface CascadeField {
  key: CascadeKey;
  label: string;
  helper: string;
}

const CASCADE_FIELDS: CascadeField[] = [
  { key: "questionType", label: "Question Type", helper: "Choose the template family" },
  { key: "board", label: "Board", helper: "Curriculum board" },
  { key: "grade", label: "Grade", helper: "Class level" },
  { key: "subject", label: "Subject", helper: "Subject stream" },
  { key: "chapter", label: "Chapter", helper: "Chapter scope" },
  { key: "topic", label: "Topic", helper: "Final topic" },
  { key: "lu", label: "Learning Unit", helper: "Final learning unit" },
];

const EMPTY_CASCADE: CascadeState = {
  questionType: "",
  board: "",
  grade: "",
  subject: "",
  chapter: "",
  topic: "",
  lu: "",
};

function getSelectedLabel(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? "";
}

function formatTemplateLabel(template: Template) {
  const name = template.template_name?.trim() || "Untitled Template";
  const questionType = template.question_type
    ? template.question_type[0].toUpperCase() + template.question_type.slice(1)
    : "Template";
  const level = template.level ? template.level.toUpperCase() : "LEVEL";
  return `${name} · ${questionType} · ${level}`;
}

function getTemplateKey(template?: Template) {
  return [template?.template_name, template?.collection_name, template?.question_type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// Only CMS/Hindi-shaped metadata is stored nested (chapter -> topics -> LUs) in CMSMetadata;
// everything else is queried level-by-level via GET.
function isPostHierarchyTemplate(template?: Template) {
  const key = getTemplateKey(template);
  return key.includes("cms") || key.includes("hindi");
}

function templateShowsTopics(template?: Template) {
  const key = getTemplateKey(template);
  return key.includes("cms") || key.includes("hindi") || key.includes("cat4");
}

function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[], enabled: boolean, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setData(fallback);
      setIsError(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, isLoading, isError };
}

export interface HierarchyPathResult {
  template: Template;
  board: string;
  grade: string;
  subject: string;
  chapterId: string;
  chapterName: string;
  topicId?: string;
  topicName?: string;
  luid?: string;
  luName?: string;
}

interface HierarchyPickerProps {
  onChange?: (result: HierarchyPathResult | null) => void;
  // Caps how deep the cascade drills regardless of the selected template's
  // natural level — e.g. DOCX ingestion is always chapter-scoped even when
  // the chosen template is topic/LU-level.
  maxDepth?: "chapter" | "topic" | "lu";
}

export function HierarchyPicker({ onChange, maxDepth }: HierarchyPickerProps) {
  const [cascade, setCascade] = useState<CascadeState>(EMPTY_CASCADE);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [highlightedOptionValue, setHighlightedOptionValue] = useState("");
  const [focusedFieldKey, setFocusedFieldKey] = useState<CascadeKey | null>(null);
  const typeaheadRef = useRef("");
  const typeaheadTimeoutRef = useRef<number | null>(null);

  const { data: templates, isLoading: templatesLoading, isError: templatesFailed } = useAsyncData(
    getTemplates,
    [],
    true,
    [] as Template[],
  );
  const { data: boards, isLoading: boardsLoading, isError: boardsFailed } = useAsyncData(
    getBoards,
    [cascade.questionType],
    Boolean(cascade.questionType),
    [] as string[],
  );
  const { data: grades, isLoading: gradesLoading, isError: gradesFailed } = useAsyncData(
    () => getGrades(cascade.board),
    [cascade.board],
    Boolean(cascade.board),
    [] as string[],
  );
  const { data: subjects, isLoading: subjectsLoading, isError: subjectsFailed } = useAsyncData(
    () => getSubjects(cascade.board, cascade.grade),
    [cascade.board, cascade.grade],
    Boolean(cascade.board && cascade.grade),
    [] as string[],
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_id === cascade.questionType),
    [cascade.questionType, templates],
  );
  const selectedTemplateLevel = selectedTemplate?.level ?? "";
  const shouldUsePostHierarchy = isPostHierarchyTemplate(selectedTemplate);
  const shouldShowTopicLevel =
    maxDepth !== "chapter" &&
    (templateShowsTopics(selectedTemplate) || selectedTemplateLevel === "lu" || selectedTemplateLevel === "topic");
  const needsLU = maxDepth !== "chapter" && maxDepth !== "topic" && selectedTemplateLevel === "lu";
  const metadataReadyForChapters = Boolean(cascade.board && cascade.grade && cascade.subject);

  const { data: chaptersData, isLoading: chaptersLoading, isError: chaptersFailed } = useAsyncData(
    () => getChapters(cascade.board, cascade.grade, cascade.subject),
    [cascade.board, cascade.grade, cascade.subject],
    metadataReadyForChapters && !shouldUsePostHierarchy,
    [] as ChapterOption[],
  );
  const { data: hierarchyChapters, isLoading: hierarchyLoading, isError: hierarchyFailed } = useAsyncData(
    () => getHierarchicalMetadata(cascade.board, cascade.grade, cascade.subject),
    [cascade.board, cascade.grade, cascade.subject],
    metadataReadyForChapters && shouldUsePostHierarchy,
    [] as HierarchicalChapter[],
  );
  const { data: topicsData, isLoading: topicsLoading, isError: topicsFailed } = useAsyncData(
    () => getTopics(cascade.chapter),
    [cascade.chapter],
    Boolean(cascade.chapter && shouldShowTopicLevel && !shouldUsePostHierarchy),
    [] as TopicOption[],
  );
  const { data: learningUnitsData, isLoading: luLoading, isError: luFailed } = useAsyncData(
    () => getLearningUnits(cascade.topic),
    [cascade.topic],
    Boolean(cascade.topic && needsLU && !shouldUsePostHierarchy),
    [] as LearningUnitOption[],
  );

  const templateOptions = useMemo(
    () => templates.map((template) => ({ label: formatTemplateLabel(template), value: template.template_id })),
    [templates],
  );
  const boardOptions = useMemo(
    () =>
      boards
        .filter(Boolean)
        .map((b) => ({ label: b, value: b }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [boards],
  );
  const gradeOptions = useMemo(
    () =>
      grades
        .filter(Boolean)
        .map((g) => ({ label: g, value: g }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    [grades],
  );
  const subjectOptions = useMemo(
    () =>
      subjects
        .filter(Boolean)
        .map((s) => ({ label: s, value: s }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [subjects],
  );

  const activeCascadeFields = useMemo(() => {
    if (!shouldShowTopicLevel) return CASCADE_FIELDS.filter((f) => f.key !== "topic" && f.key !== "lu");
    if (!needsLU) return CASCADE_FIELDS.filter((f) => f.key !== "lu");
    return CASCADE_FIELDS;
  }, [needsLU, shouldShowTopicLevel]);

  const chapterOptions = useMemo(() => {
    if (shouldUsePostHierarchy) {
      return hierarchyChapters
        .map((c) => ({ label: c.chapter_name, value: String(c.chapter_id ?? c.chapter_name) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    }
    return chaptersData
      .map((c) => ({ label: c.chapter_name, value: String(c.chapter_id) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [chaptersData, hierarchyChapters, shouldUsePostHierarchy]);

  const topicOptions = useMemo(() => {
    if (!shouldShowTopicLevel) return [];
    if (shouldUsePostHierarchy) {
      const chapter = hierarchyChapters.find((c) => String(c.chapter_id ?? c.chapter_name) === cascade.chapter);
      return (chapter?.topics ?? [])
        .map((t) => ({ label: t.topic_name, value: String(t.topic_id) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    }
    return topicsData
      .map((t) => ({ label: t.topic_name, value: String(t.topic_id) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [cascade.chapter, hierarchyChapters, shouldShowTopicLevel, shouldUsePostHierarchy, topicsData]);

  const luOptions = useMemo(() => {
    if (!needsLU) return [];
    if (shouldUsePostHierarchy) {
      const chapter = hierarchyChapters.find((c) => String(c.chapter_id ?? c.chapter_name) === cascade.chapter);
      const topic = chapter?.topics.find((t) => String(t.topic_id) === cascade.topic);
      return (topic?.learning_units ?? [])
        .filter((lu) => lu.luid)
        .map((lu) => ({ label: lu.lu_name ?? lu.lu ?? lu.luid ?? "", value: lu.luid ?? "" }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    }
    return learningUnitsData
      .filter((lu) => lu.luid)
      .map((lu) => ({ label: lu.lu_name ?? lu.lu ?? lu.luid ?? "", value: lu.luid ?? "" }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [cascade.chapter, cascade.topic, hierarchyChapters, learningUnitsData, needsLU, shouldUsePostHierarchy]);

  const selectedTrail = useMemo(() => {
    const trailOptions: Record<CascadeKey, SelectOption[]> = {
      questionType: templateOptions,
      board: boardOptions,
      grade: gradeOptions,
      subject: subjectOptions,
      chapter: chapterOptions,
      topic: topicOptions,
      lu: luOptions,
    };
    return activeCascadeFields
      .map((field) => ({ field, label: getSelectedLabel(trailOptions[field.key], cascade[field.key]) }))
      .filter((item) => Boolean(item.label));
  }, [
    activeCascadeFields,
    boardOptions,
    cascade,
    chapterOptions,
    gradeOptions,
    luOptions,
    subjectOptions,
    templateOptions,
    topicOptions,
  ]);

  const activeFieldIndex = useMemo(() => {
    const focusedIndex = focusedFieldKey ? activeCascadeFields.findIndex((f) => f.key === focusedFieldKey) : -1;
    if (focusedIndex !== -1) return focusedIndex;
    const firstEmptyIndex = activeCascadeFields.findIndex((f) => !cascade[f.key]);
    return firstEmptyIndex === -1 ? activeCascadeFields.length - 1 : firstEmptyIndex;
  }, [activeCascadeFields, cascade, focusedFieldKey]);

  const activeField = activeCascadeFields[activeFieldIndex];
  const pickerLabel = selectedTrail.length ? selectedTrail.map((i) => i.label).join(" / ") : "Select question path";
  const isPathComplete = needsLU ? Boolean(cascade.lu) : shouldShowTopicLevel ? Boolean(cascade.topic) : Boolean(cascade.chapter);

  function getOptionsForField(key: CascadeKey) {
    if (key === "questionType") return templateOptions;
    if (key === "board") return boardOptions;
    if (key === "grade") return gradeOptions;
    if (key === "subject") return subjectOptions;
    if (key === "chapter") return chapterOptions;
    if (key === "topic") return topicOptions;
    return luOptions;
  }

  const activeOptions = getOptionsForField(activeField.key);
  const isActiveFieldLoading =
    (activeField.key === "questionType" && templatesLoading) ||
    (activeField.key === "board" && boardsLoading) ||
    (activeField.key === "grade" && gradesLoading) ||
    (activeField.key === "subject" && subjectsLoading) ||
    (activeField.key === "chapter" && (shouldUsePostHierarchy ? hierarchyLoading : chaptersLoading)) ||
    (activeField.key === "topic" && (shouldUsePostHierarchy ? hierarchyLoading : topicsLoading)) ||
    (activeField.key === "lu" && (shouldUsePostHierarchy ? hierarchyLoading : luLoading));
  const activeFieldFailed =
    (activeField.key === "questionType" && templatesFailed) ||
    (activeField.key === "board" && boardsFailed) ||
    (activeField.key === "grade" && gradesFailed) ||
    (activeField.key === "subject" && subjectsFailed) ||
    (activeField.key === "chapter" && (shouldUsePostHierarchy ? hierarchyFailed : chaptersFailed)) ||
    (activeField.key === "topic" && (shouldUsePostHierarchy ? hierarchyFailed : topicsFailed)) ||
    (activeField.key === "lu" && (shouldUsePostHierarchy ? hierarchyFailed : luFailed));

  function getDefaultHighlightedOptionValue(fieldKey: CascadeKey) {
    const options = getOptionsForField(fieldKey);
    return cascade[fieldKey] || options[0]?.value || "";
  }

  function openPicker(fieldKey?: CascadeKey | null) {
    const nextFieldKey = fieldKey ?? focusedFieldKey ?? activeField.key;
    setFocusedFieldKey(fieldKey ?? null);
    setHighlightedOptionValue(getDefaultHighlightedOptionValue(nextFieldKey));
    setIsPickerOpen(true);
  }

  function handleCascadeChange(key: CascadeKey, value: string) {
    const isTerminalSelection = key === activeCascadeFields[activeCascadeFields.length - 1]?.key;

    if (cascade[key] === value) {
      setFocusedFieldKey(null);
      if (isTerminalSelection) setIsPickerOpen(false);
      return;
    }

    setFocusedFieldKey(null);
    setHighlightedOptionValue(value);
    setCascade((current) => {
      const next = { ...current, [key]: value };
      const changedIndex = CASCADE_FIELDS.findIndex((f) => f.key === key);
      CASCADE_FIELDS.slice(changedIndex + 1).forEach((f) => {
        next[f.key] = "";
      });
      return next;
    });

    if (isTerminalSelection) setIsPickerOpen(false);
  }

  function handleBackLevel() {
    const previousField = activeCascadeFields[Math.max(activeFieldIndex - 1, 0)];
    handleCascadeChange(previousField.key, "");
    setHighlightedOptionValue(getDefaultHighlightedOptionValue(previousField.key));
    setIsPickerOpen(true);
  }

  function handleTrailItemClick(key: CascadeKey) {
    openPicker(key);
  }

  function handlePickerTypeahead(key: string) {
    const normalizedKey = key.toLowerCase();
    const nextQuery = `${typeaheadRef.current}${normalizedKey}`;
    const matchedOption =
      activeOptions.find((o) => o.label.toLowerCase().startsWith(nextQuery)) ??
      activeOptions.find((o) => o.label.toLowerCase().startsWith(normalizedKey));

    if (!matchedOption) return;

    setIsPickerOpen(true);
    setHighlightedOptionValue(matchedOption.value);
    typeaheadRef.current = matchedOption.label.toLowerCase().startsWith(nextQuery) ? nextQuery : normalizedKey;

    if (typeaheadTimeoutRef.current) window.clearTimeout(typeaheadTimeoutRef.current);
    typeaheadTimeoutRef.current = window.setTimeout(() => {
      typeaheadRef.current = "";
      typeaheadTimeoutRef.current = null;
    }, 700);
  }

  function handleClearPath() {
    setCascade(EMPTY_CASCADE);
    setFocusedFieldKey(null);
    setIsPickerOpen(false);
  }

  useEffect(() => {
    if (!selectedTemplate || !isPathComplete) {
      onChange?.(null);
      return;
    }
    onChange?.({
      template: selectedTemplate,
      board: cascade.board,
      grade: cascade.grade,
      subject: cascade.subject,
      chapterId: cascade.chapter,
      chapterName: getSelectedLabel(chapterOptions, cascade.chapter),
      topicId: cascade.topic || undefined,
      topicName: cascade.topic ? getSelectedLabel(topicOptions, cascade.topic) : undefined,
      luid: needsLU && cascade.lu ? cascade.lu : undefined,
      luName: needsLU && cascade.lu ? getSelectedLabel(luOptions, cascade.lu) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascade, isPathComplete, selectedTemplate]);

  return (
    <div className="relative w-full max-w-2xl">
      <button
        type="button"
        onClick={() => (isPickerOpen ? setIsPickerOpen(false) : openPicker())}
        onKeyDown={(event) => {
          if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey && /\S/.test(event.key)) {
            event.preventDefault();
            handlePickerTypeahead(event.key);
          }
          if (event.key === "Enter" && isPickerOpen && highlightedOptionValue) {
            event.preventDefault();
            handleCascadeChange(activeField.key, highlightedOptionValue);
          }
        }}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-left text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        aria-expanded={isPickerOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          <LuLayers className="h-4 w-4 shrink-0 text-indigo-600" />
          <span className="truncate">{pickerLabel}</span>
        </span>
        <LuChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isPickerOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isPickerOpen ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{activeField.label}</p>
              <p className="mt-0.5 truncate text-xs text-slate-700">{activeField.helper}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {activeFieldIndex > 0 ? (
                <button
                  type="button"
                  onClick={handleBackLevel}
                  aria-label="Previous level"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <LuArrowLeft className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                aria-label="Close picker"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              >
                <LuX className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {isActiveFieldLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
                Loading {activeField.label.toLowerCase()}...
              </div>
            ) : null}
            {activeFieldFailed ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-xs font-semibold text-red-600">
                Could not load {activeField.label.toLowerCase()}.
              </div>
            ) : null}
            {!isActiveFieldLoading && !activeFieldFailed && activeOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
                No options available.
              </div>
            ) : null}
            {activeOptions.map((option) => {
              const isSelected = cascade[activeField.key] === option.value;
              const isHighlighted = highlightedOptionValue === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseEnter={() => setHighlightedOptionValue(option.value)}
                  onClick={() => handleCascadeChange(activeField.key, option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-700"
                      : isHighlighted
                        ? "bg-slate-50 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {activeFieldIndex === activeCascadeFields.length - 1 ? null : isSelected ? (
                    <LuCircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <LuChevronDown className="h-3.5 w-3.5 shrink-0 -rotate-90 text-slate-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex min-h-9 flex-wrap items-center gap-1.5">
        {selectedTrail.length ? (
          selectedTrail.map((item, index) => {
            const isActiveChip = isPickerOpen && activeField.key === item.field.key;
            return (
              <span key={`${item.field.key}-${item.label}`} className="inline-flex items-center gap-1.5">
                {index > 0 ? <span className="text-slate-300">/</span> : null}
                <button
                  type="button"
                  onClick={() => handleTrailItemClick(item.field.key)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    isActiveChip
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {item.label}
                </button>
              </span>
            );
          })
        ) : (
          <span className="rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-400">
            No path selected
          </span>
        )}
        {selectedTrail.length ? (
          <button
            type="button"
            onClick={handleClearPath}
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <LuX className="h-3 w-3" /> Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
