"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuChevronDown,
  LuCircleCheck,
  LuLayers,
  LuX,
} from "react-icons/lu";
import { AppShell } from "@/components/common/AppShell";
import { getTemplates } from "@/features/templates/services/templates.service";
import {
  getBoards,
  getChapters,
  getGrades,
  getHierarchicalMetadata,
  getLearningUnits,
  getSubjects,
  getTopics,
} from "@/features/metadata/services/metadata.service";
import { getDashboardData } from "@/features/dashboard/services/dashboard.service";
import type { ChapterOption, HierarchicalChapter, TopicOption } from "@/types/metadata";
import type { Template } from "@/types/template";
import type {
  DashboardApiResult,
  DashboardChapterItem,
  DashboardCloneEntry,
  DashboardCloneMappingItem,
  DashboardLuChapter,
  DashboardTopicItem,
  GetDashboardPayload,
} from "@/types/dashboard";

type CascadeKey = "questionType" | "board" | "grade" | "subject" | "chapter" | "topic";
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

interface SummaryCard {
  label: string;
  value: string | number;
  hint: string;
}

const SUMMARY_CARD_VALUE_COLORS = [
  "text-orange-700",
  "text-blue-700",
  "text-indigo-700",
  "text-green-700",
  "text-pink-700",
] as const;

const INITIAL_CASCADE_STATE: CascadeState = {
  questionType: "",
  board: "",
  grade: "",
  subject: "",
  chapter: "",
  topic: "",
};

const CASCADE_FIELDS: CascadeField[] = [
  { key: "questionType", label: "Question Type", helper: "Choose the template family" },
  { key: "board", label: "Board", helper: "Curriculum board" },
  { key: "grade", label: "Grade", helper: "Class level" },
  { key: "subject", label: "Subject", helper: "Subject stream" },
  { key: "chapter", label: "Chapter", helper: "Chapter scope" },
  { key: "topic", label: "Topic", helper: "Final topic" },
];

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

function isPostHierarchyTemplate(template?: Template) {
  const key = getTemplateKey(template);
  return key.includes("cms") || key.includes("hindi");
}

function templateShowsTopics(template?: Template) {
  const key = getTemplateKey(template);
  return key.includes("cms") || key.includes("hindi") || key.includes("cat4");
}

function normalizeFilterId(value: string | number) {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function getNormalizedLevel(loid: string, lo?: string) {
  let levelDigit = 1;

  if (loid?.trim()) {
    levelDigit = Number(loid.charAt(loid.length - 1));
  } else if (lo?.trim()) {
    const loMatch = lo.match(/\(LU\d+\.(\d{3})\)/);
    if (loMatch?.[1]) {
      levelDigit = Number(loMatch[1].charAt(loMatch[1].length - 1));
    }
  }

  if (levelDigit === 1 || levelDigit === 2) return 1;
  if (levelDigit === 3) return 2;
  if (levelDigit === 4 || levelDigit === 5 || levelDigit === 6) return 3;
  return 1;
}

function getCloneLevelMeta(loid: string, lo?: string) {
  const normalizedLevel = getNormalizedLevel(loid, lo);
  if (normalizedLevel === 1) return { label: "I", requiredClones: 1, levelNumber: 1 };
  if (normalizedLevel === 2) return { label: "II", requiredClones: 2, levelNumber: 2 };
  if (normalizedLevel === 3) return { label: "III", requiredClones: 2, levelNumber: 3 };
  return { label: "I", requiredClones: 1, levelNumber: 1 };
}

function getLevelBadgeClass(level: string) {
  if (level === "I") return "border-blue-200 bg-blue-50 text-blue-700";
  if (level === "II") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-purple-200 bg-purple-50 text-purple-700";
}

export function DashboardPage() {
  const [cascade, setCascade] = useState<CascadeState>(INITIAL_CASCADE_STATE);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [highlightedOptionValue, setHighlightedOptionValue] = useState("");
  const [expandedLuids, setExpandedLuids] = useState<string[]>([]);
  const [focusedFieldKey, setFocusedFieldKey] = useState<CascadeKey | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const pickerTypeaheadRef = useRef("");
  const pickerTypeaheadTimeoutRef = useRef<number | null>(null);

  const [dashboardData, setDashboardData] = useState<DashboardApiResult | null>(null);
  const [isFetchPending, setIsFetchPending] = useState(false);
  const [isFetchError, setIsFetchError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const { data: templates, isLoading: templatesLoading, isError: templatesFailed } = useAsyncData(
    getTemplates,
    [],
    true,
    [] as Template[],
  );
  const { data: boards, isLoading: boardsLoading, isError: boardsFailed } = useAsyncData(
    getBoards,
    [],
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

  const templateOptions = useMemo(
    () => templates.map((template) => ({ label: formatTemplateLabel(template), value: template.template_id })),
    [templates],
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_id === cascade.questionType),
    [cascade.questionType, templates],
  );
  const selectedTemplateLevel = selectedTemplate?.level ?? "";
  const shouldUsePostHierarchy = isPostHierarchyTemplate(selectedTemplate);
  const shouldShowTopicLevel =
    templateShowsTopics(selectedTemplate) || selectedTemplateLevel === "lu" || selectedTemplateLevel === "topic";
  const shouldStopAtChapterForDashboard = selectedTemplateLevel === "lu" && shouldUsePostHierarchy;
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
  const {
    data: learningUnitsData,
    isLoading: learningUnitsLoading,
    isError: learningUnitsFailed,
  } = useAsyncData(
    () => getLearningUnits(cascade.topic),
    [cascade.topic],
    Boolean(cascade.topic && selectedTemplateLevel === "lu" && !shouldUsePostHierarchy),
    [] as Array<{ luid?: string; lu?: string; lu_name?: string }>,
  );

  const boardOptions = useMemo(
    () => boards.filter(Boolean).map((b) => ({ label: b, value: b })).sort((a, b) => a.label.localeCompare(b.label)),
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
    () => subjects.filter(Boolean).map((s) => ({ label: s, value: s })).sort((a, b) => a.label.localeCompare(b.label)),
    [subjects],
  );
  const activeCascadeFields = useMemo(
    () =>
      shouldShowTopicLevel && !shouldStopAtChapterForDashboard
        ? CASCADE_FIELDS
        : CASCADE_FIELDS.filter((f) => f.key !== "topic"),
    [shouldShowTopicLevel, shouldStopAtChapterForDashboard],
  );

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
    if (!shouldShowTopicLevel || shouldStopAtChapterForDashboard) return [];
    if (shouldUsePostHierarchy) {
      const chapter = hierarchyChapters.find((c) => String(c.chapter_id ?? c.chapter_name) === cascade.chapter);
      return (chapter?.topics ?? [])
        .map((t) => ({ label: t.topic_name, value: String(t.topic_id) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    }
    return topicsData
      .map((t) => ({ label: t.topic_name, value: String(t.topic_id) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [cascade.chapter, hierarchyChapters, shouldShowTopicLevel, shouldStopAtChapterForDashboard, shouldUsePostHierarchy, topicsData]);

  const selectedHierarchyTopic = useMemo(() => {
    if (!shouldUsePostHierarchy || !cascade.chapter || !cascade.topic) return null;
    const chapter = hierarchyChapters.find((c) => String(c.chapter_id ?? c.chapter_name) === cascade.chapter);
    return chapter?.topics.find((t) => String(t.topic_id) === cascade.topic) ?? null;
  }, [cascade.chapter, cascade.topic, hierarchyChapters, shouldUsePostHierarchy]);

  const selectedHierarchyChapter = useMemo(() => {
    if (!shouldUsePostHierarchy || !cascade.chapter) return null;
    return hierarchyChapters.find((c) => String(c.chapter_id ?? c.chapter_name) === cascade.chapter) ?? null;
  }, [cascade.chapter, hierarchyChapters, shouldUsePostHierarchy]);

  const selectedTrail = useMemo(() => {
    const trailOptions: Record<CascadeKey, SelectOption[]> = {
      questionType: templateOptions,
      board: boardOptions,
      grade: gradeOptions,
      subject: subjectOptions,
      chapter: chapterOptions,
      topic: topicOptions,
    };
    return activeCascadeFields
      .map((field) => ({ field, label: getSelectedLabel(trailOptions[field.key], cascade[field.key]) }))
      .filter((item) => Boolean(item.label));
  }, [activeCascadeFields, boardOptions, cascade, chapterOptions, gradeOptions, subjectOptions, templateOptions, topicOptions]);

  const activeFieldIndex = useMemo(() => {
    const focusedIndex = focusedFieldKey ? activeCascadeFields.findIndex((f) => f.key === focusedFieldKey) : -1;
    if (focusedIndex !== -1) return focusedIndex;
    const firstEmptyIndex = activeCascadeFields.findIndex((f) => !cascade[f.key]);
    return firstEmptyIndex === -1 ? activeCascadeFields.length - 1 : firstEmptyIndex;
  }, [activeCascadeFields, cascade, focusedFieldKey]);

  const activeField = activeCascadeFields[activeFieldIndex];
  const pickerLabel = selectedTrail.length ? selectedTrail.map((i) => i.label).join(" / ") : "Select dashboard path";
  const isPathComplete =
    shouldShowTopicLevel && !shouldStopAtChapterForDashboard ? Boolean(cascade.topic) : Boolean(cascade.chapter);
  const isFilterDataLoading = selectedTemplateLevel === "lu" && !shouldUsePostHierarchy && learningUnitsLoading;
  const isFilterDataFailed = selectedTemplateLevel === "lu" && !shouldUsePostHierarchy && learningUnitsFailed;
  const canFetchDashboard = Boolean(selectedTemplate && isPathComplete);

  function getOptionsForField(key: CascadeKey) {
    if (key === "questionType") return templateOptions;
    if (key === "board") return boardOptions;
    if (key === "grade") return gradeOptions;
    if (key === "subject") return subjectOptions;
    if (key === "chapter") return chapterOptions;
    return topicOptions;
  }

  const activeOptions = getOptionsForField(activeField.key);
  const isActiveFieldLoading =
    (activeField.key === "questionType" && templatesLoading) ||
    (activeField.key === "board" && boardsLoading) ||
    (activeField.key === "grade" && gradesLoading) ||
    (activeField.key === "subject" && subjectsLoading) ||
    (activeField.key === "chapter" && (shouldUsePostHierarchy ? hierarchyLoading : chaptersLoading)) ||
    (activeField.key === "topic" && (shouldUsePostHierarchy ? hierarchyLoading : topicsLoading));
  const activeFieldFailed =
    (activeField.key === "questionType" && templatesFailed) ||
    (activeField.key === "board" && boardsFailed) ||
    (activeField.key === "grade" && gradesFailed) ||
    (activeField.key === "subject" && subjectsFailed) ||
    (activeField.key === "chapter" && (shouldUsePostHierarchy ? hierarchyFailed : chaptersFailed)) ||
    (activeField.key === "topic" && (shouldUsePostHierarchy ? hierarchyFailed : topicsFailed));

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

  const buildDashboardPayload = useCallback(
    (luidsOverride?: string[]): GetDashboardPayload | null => {
      if (!selectedTemplate || !cascade.questionType) return null;

      let filterValue: GetDashboardPayload["filter_value"] = [];

      if (selectedTemplateLevel === "lu") {
        const chapterLuids = selectedHierarchyChapter?.topics
          ?.flatMap((topic) => topic.learning_units ?? [])
          .map((lu) => lu.luid)
          .filter((luid): luid is string => Boolean(luid));
        const hierarchyLuids = selectedHierarchyTopic?.learning_units
          ?.map((lu) => lu.luid)
          .filter((luid): luid is string => Boolean(luid));
        const directLuids = learningUnitsData.map((lu) => lu.luid).filter((luid): luid is string => Boolean(luid));

        filterValue = luidsOverride?.length
          ? luidsOverride
          : shouldStopAtChapterForDashboard
            ? chapterLuids ?? []
            : hierarchyLuids?.length
              ? hierarchyLuids
              : directLuids;
      } else if (selectedTemplateLevel === "topic") {
        filterValue = normalizeFilterId(cascade.topic);
      } else if (selectedTemplateLevel === "chapter") {
        filterValue = shouldUsePostHierarchy
          ? normalizeFilterId(selectedHierarchyChapter?.chapter_id ?? cascade.chapter)
          : normalizeFilterId(cascade.chapter);
      } else {
        filterValue = normalizeFilterId(shouldShowTopicLevel && cascade.topic ? cascade.topic : cascade.chapter);
      }

      if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return null;

      return { template_id: cascade.questionType, filter_value: filterValue };
    },
    [
      cascade.chapter,
      cascade.questionType,
      cascade.topic,
      learningUnitsData,
      selectedHierarchyChapter,
      selectedHierarchyTopic,
      selectedTemplate,
      selectedTemplateLevel,
      shouldStopAtChapterForDashboard,
      shouldShowTopicLevel,
      shouldUsePostHierarchy,
    ],
  );

  function handleCascadeChange(key: CascadeKey, value: string) {
    const isTerminalSelection =
      key === "topic" || (key === "chapter" && (!shouldShowTopicLevel || shouldStopAtChapterForDashboard));

    if (cascade[key] === value) {
      setFocusedFieldKey(null);
      if (isTerminalSelection) setIsPickerOpen(false);
      return;
    }

    setFocusedFieldKey(null);
    setHighlightedOptionValue(value);
    setRequestError(null);
    setDashboardData(null);
    setIsFetchError(false);
    setHasFetched(false);
    setCascade((current) => {
      const next = { ...current, [key]: value };
      const changedIndex = CASCADE_FIELDS.findIndex((field) => field.key === key);
      CASCADE_FIELDS.slice(changedIndex + 1).forEach((field) => {
        next[field.key] = "";
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
    const nextQuery = `${pickerTypeaheadRef.current}${normalizedKey}`;
    const matchedOption =
      activeOptions.find((o) => o.label.toLowerCase().startsWith(nextQuery)) ??
      activeOptions.find((o) => o.label.toLowerCase().startsWith(normalizedKey));

    if (!matchedOption) return;

    setIsPickerOpen(true);
    setHighlightedOptionValue(matchedOption.value);
    pickerTypeaheadRef.current = matchedOption.label.toLowerCase().startsWith(nextQuery) ? nextQuery : normalizedKey;

    if (pickerTypeaheadTimeoutRef.current) window.clearTimeout(pickerTypeaheadTimeoutRef.current);
    pickerTypeaheadTimeoutRef.current = window.setTimeout(() => {
      pickerTypeaheadRef.current = "";
      pickerTypeaheadTimeoutRef.current = null;
    }, 700);
  }

  function handleClearPath() {
    setCascade(INITIAL_CASCADE_STATE);
    setFocusedFieldKey(null);
    setRequestError(null);
    setIsPickerOpen(false);
    setExpandedLuids([]);
    setDashboardData(null);
    setIsFetchError(false);
    setHasFetched(false);
  }

  async function handleGetDashboard() {
    setRequestError(null);
    let payload = buildDashboardPayload();

    if (selectedTemplateLevel === "lu" && cascade.topic && !payload) {
      try {
        const learningUnits = await getLearningUnits(cascade.topic);
        const luids = learningUnits.map((lu) => lu.luid).filter((luid): luid is string => Boolean(luid));
        payload = buildDashboardPayload(luids);
      } catch {
        setRequestError("Could not load learning units for the selected topic.");
        return;
      }
    }

    if (!payload) {
      setRequestError("The selected path does not have the required filter for this template level.");
      return;
    }

    setExpandedLuids([]);
    setIsFetchPending(true);
    setIsFetchError(false);
    try {
      const result = await getDashboardData(payload);
      setDashboardData(result);
      setHasFetched(true);
    } catch {
      setIsFetchError(true);
    } finally {
      setIsFetchPending(false);
    }
  }

  const luChapters = useMemo(
    () => ((selectedTemplateLevel === "lu" ? (dashboardData?.dashboard_data as DashboardLuChapter[] | undefined) : []) ?? []),
    [dashboardData?.dashboard_data, selectedTemplateLevel],
  );
  const topicRows = useMemo(
    () => ((selectedTemplateLevel === "topic" ? (dashboardData?.dashboard_data as DashboardTopicItem[] | undefined) : []) ?? []),
    [dashboardData?.dashboard_data, selectedTemplateLevel],
  );
  const chapterRows = useMemo(
    () => ((selectedTemplateLevel === "chapter" ? (dashboardData?.dashboard_data as DashboardChapterItem[] | undefined) : []) ?? []),
    [dashboardData?.dashboard_data, selectedTemplateLevel],
  );
  const cloneMappingByLuid = useMemo(() => {
    const mappingItems = dashboardData?.original_clone_mapping ?? [];
    return mappingItems.reduce<Record<string, DashboardCloneMappingItem["clones_by_original"]>>((acc, item) => {
      acc[item.luid] = item.clones_by_original;
      return acc;
    }, {});
  }, [dashboardData?.original_clone_mapping]);

  const luRows = useMemo(
    () =>
      luChapters.flatMap((chapter) =>
        chapter.learning_units.map((lu) => ({ chapter_name: chapter.chapter_name, grade: chapter.grade, ...lu })),
      ),
    [luChapters],
  );
  const luRowCountsByLuid = useMemo(() => {
    return luRows.reduce<Record<string, [number, number, number, number, number, number]>>((acc, row) => {
      const cloneMapping = cloneMappingByLuid[row.luid] ?? {};
      const counts: Record<number, { original: number; clone: number }> = {
        1: { original: 0, clone: 0 },
        2: { original: 0, clone: 0 },
        3: { original: 0, clone: 0 },
      };

      Object.values(cloneMapping).forEach((entry) => {
        const cloneEntry = entry as DashboardCloneEntry;
        const { levelNumber } = getCloneLevelMeta(cloneEntry.loid, cloneEntry.lo);
        counts[levelNumber].original += 1;
        counts[levelNumber].clone += Array.isArray(cloneEntry.clones) ? cloneEntry.clones.length : 0;
      });

      acc[row.luid] = [
        counts[1].original,
        counts[1].clone,
        counts[2].original,
        counts[2].clone,
        counts[3].original,
        counts[3].clone,
      ];
      return acc;
    }, {});
  }, [cloneMappingByLuid, luRows]);
  const luDetailRowsByLuid = useMemo(() => {
    return luRows.reduce<
      Record<
        string,
        Array<{
          levelLabel: string;
          requiredClones: number;
          originalQid: string;
          cloneIds: Array<string | number>;
          availableClones: number;
          delta: number;
        }>
      >
    >((acc, row) => {
      const cloneMapping = cloneMappingByLuid[row.luid] ?? {};
      const detailRows = Object.entries(cloneMapping).map(([originalQid, entry]) => {
        const cloneEntry = entry as DashboardCloneEntry;
        const levelMeta = getCloneLevelMeta(cloneEntry.loid, cloneEntry.lo);
        const availableClones = cloneEntry.clones.length;
        return {
          levelLabel: levelMeta.label,
          requiredClones: levelMeta.requiredClones,
          originalQid,
          cloneIds: cloneEntry.clones,
          availableClones,
          delta: levelMeta.requiredClones - availableClones,
        };
      });
      detailRows.sort((a, b) => Number(a.originalQid) - Number(b.originalQid));
      acc[row.luid] = detailRows;
      return acc;
    }, {});
  }, [cloneMappingByLuid, luRows]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    if (selectedTemplateLevel === "lu") {
      const totalQuestions = luRows.reduce((sum, row) => {
        const counts = luRowCountsByLuid[row.luid] ?? [0, 0, 0, 0, 0, 0];
        return sum + counts.reduce((rowTotal, count) => rowTotal + count, 0);
      }, 0);
      const originals = luRows.reduce((sum, row) => {
        const counts = luRowCountsByLuid[row.luid] ?? [0, 0, 0, 0, 0, 0];
        return sum + counts[0] + counts[2] + counts[4];
      }, 0);
      const clones = luRows.reduce((sum, row) => {
        const counts = luRowCountsByLuid[row.luid] ?? [0, 0, 0, 0, 0, 0];
        return sum + counts[1] + counts[3] + counts[5];
      }, 0);

      return [
        { label: "Total Questions", value: totalQuestions, hint: "" },
        { label: "Chapters", value: luChapters.length, hint: "" },
        { label: "Learning Units", value: luRows.length, hint: "" },
        { label: "Originals", value: originals, hint: "" },
        { label: "Clones", value: clones, hint: "" },
      ];
    }

    if (selectedTemplateLevel === "topic") {
      const totalQuestions = topicRows.reduce((sum, row) => sum + row.question_count, 0);
      return [
        { label: "Total Questions", value: totalQuestions, hint: "Across the selected topics" },
        { label: "Topics", value: topicRows.length, hint: "Grouped topic rows" },
      ];
    }

    if (selectedTemplateLevel === "chapter") {
      const totalQuestions = chapterRows.reduce((sum, row) => sum + row.question_count, 0);
      const uniqueChapters = new Set(chapterRows.map((row) => String(row.chapter_id))).size;
      const uniqueFormats = new Set(chapterRows.map((row) => row.question_format)).size;

      return [
        { label: "Total Questions", value: totalQuestions, hint: "Across the selected chapters" },
        { label: "Chapters", value: uniqueChapters, hint: "Matched chapter ids" },
        { label: "Formats", value: uniqueFormats, hint: "Distinct question formats" },
      ];
    }

    return [];
  }, [chapterRows, luChapters.length, luRowCountsByLuid, luRows, selectedTemplateLevel, topicRows]);

  const hasResults =
    (selectedTemplateLevel === "lu" && luRows.length > 0) ||
    (selectedTemplateLevel === "topic" && topicRows.length > 0) ||
    (selectedTemplateLevel === "chapter" && chapterRows.length > 0);

  function toggleExpandedLuid(luid: string) {
    setExpandedLuids((current) => (current.includes(luid) ? current.filter((item) => item !== luid) : [...current, luid]));
  }

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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

            <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-44">
              <button
                type="button"
                onClick={() => void handleGetDashboard()}
                disabled={!canFetchDashboard || isFetchPending}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isFetchPending || isFilterDataLoading ? "Loading..." : "Get Dashboard"}
              </button>
              {isPathComplete ? (
                <span className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700">
                  <LuCircleCheck className="h-3 w-3" />
                  Ready
                </span>
              ) : null}
            </div>
          </div>

          {isFetchError || requestError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {requestError ?? "Could not fetch dashboard data. Please check the selected path and try again."}
            </div>
          ) : null}
          {isFilterDataFailed ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              Could not load learning units for this topic.
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-5">
            {summaryCards.length ? (
              summaryCards.map((card, index) => (
                <section key={card.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </span>
                  <p className={`mt-3 text-4xl font-extrabold tracking-tight ${SUMMARY_CARD_VALUE_COLORS[index % SUMMARY_CARD_VALUE_COLORS.length]}`}>
                    {card.value}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{card.hint}</p>
                </section>
              ))
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-5">
                Select a dashboard path and click <strong className="text-slate-900">Get Dashboard</strong>.
              </section>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isFetchPending ? (
            <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500">Loading dashboard data...</div>
          ) : !hasResults ? (
            <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
              {hasFetched ? "No dashboard data found for the selected path." : "Dashboard results will appear here."}
            </div>
          ) : selectedTemplateLevel === "lu" ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-14 px-3 py-3 text-center font-medium">View</th>
                    <th className="px-3 py-3 font-medium">LUID</th>
                    <th className="px-3 py-3 font-medium">LU Name</th>
                    <th className="px-3 py-3 text-center font-medium">L1 Original</th>
                    <th className="px-3 py-3 text-center font-medium">L1 Clone</th>
                    <th className="px-3 py-3 text-center font-medium">L2 Original</th>
                    <th className="px-3 py-3 text-center font-medium">L2 Clone</th>
                    <th className="px-3 py-3 text-center font-medium">L3 Original</th>
                    <th className="px-3 py-3 text-center font-medium">L3 Clone</th>
                    <th className="px-3 py-3 text-center font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {luRows.map((row) => {
                    const isExpanded = expandedLuids.includes(row.luid);
                    const detailRows = luDetailRowsByLuid[row.luid] ?? [];
                    const rowCounts = luRowCountsByLuid[row.luid] ?? [0, 0, 0, 0, 0, 0];
                    const total = rowCounts.reduce((sum, count) => sum + count, 0);

                    return (
                      <Fragment key={`${row.luid}-${row.chapter_name}`}>
                        <tr className={isExpanded ? "bg-slate-50" : "bg-white hover:bg-slate-50"}>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandedLuid(row.luid)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                isExpanded
                                  ? "border-blue-300 bg-blue-100 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                              }`}
                              aria-label={isExpanded ? `Collapse details for ${row.luid}` : `Expand details for ${row.luid}`}
                              aria-expanded={isExpanded}
                            >
                              <LuChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900">{row.luid}</td>
                          <td className="px-3 py-3 text-slate-700">{row.lu_name || row.lu}</td>
                          <td className="px-3 py-3 text-center font-semibold text-blue-600">{rowCounts[0]}</td>
                          <td className="px-3 py-3 text-center font-semibold text-teal-700">{rowCounts[1]}</td>
                          <td className="px-3 py-3 text-center font-semibold text-violet-600">{rowCounts[2]}</td>
                          <td className="px-3 py-3 text-center font-semibold text-pink-700">{rowCounts[3]}</td>
                          <td className="px-3 py-3 text-center font-semibold text-orange-700">{rowCounts[4]}</td>
                          <td className="px-3 py-3 text-center font-semibold text-emerald-600">{rowCounts[5]}</td>
                          <td className="px-3 py-3 text-center font-extrabold text-slate-900">{total}</td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-slate-50">
                            <td colSpan={10} className="px-6 py-4">
                              {detailRows.length ? (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                  <table className="min-w-[900px] w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                      <tr>
                                        <th className="px-3 py-3 font-medium">Level</th>
                                        <th className="px-3 py-3 text-center font-medium">No of clone req</th>
                                        <th className="px-3 py-3 text-center font-medium">Original QID</th>
                                        <th className="px-3 py-3 text-center font-medium">Clone IDs</th>
                                        <th className="px-3 py-3 text-center font-medium">No of clone available</th>
                                        <th className="px-3 py-3 text-center font-medium">Delta</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {detailRows.map((detailRow) => (
                                        <tr key={`${row.luid}-${detailRow.originalQid}`}>
                                          <td className="px-3 py-3">
                                            <span
                                              className={`inline-flex min-w-[42px] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-bold ${getLevelBadgeClass(detailRow.levelLabel)}`}
                                            >
                                              {detailRow.levelLabel}
                                            </span>
                                          </td>
                                          <td className="px-3 py-3 text-center font-semibold text-orange-700">{detailRow.requiredClones}</td>
                                          <td className="px-3 py-3 text-center font-semibold text-slate-900">{detailRow.originalQid}</td>
                                          <td className="px-3 py-3 text-center text-slate-700">
                                            {detailRow.cloneIds.length ? (
                                              detailRow.cloneIds.join(", ")
                                            ) : (
                                              <span className="italic text-slate-400">No clones</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-3 text-center font-semibold text-sky-700">{detailRow.availableClones}</td>
                                          <td
                                            className={`px-3 py-3 text-center font-extrabold ${
                                              detailRow.delta > 0 ? "text-red-600" : detailRow.delta < 0 ? "text-green-700" : "text-slate-900"
                                            }`}
                                          >
                                            {detailRow.delta}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm font-medium text-slate-500">
                                  No clone mapping details found for this learning unit.
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : selectedTemplateLevel === "topic" ? (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Topic ID</th>
                    <th className="px-3 py-3 font-medium">Topic Name</th>
                    <th className="px-3 py-3 text-center font-medium">Question Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topicRows.map((row) => (
                    <tr key={`${row.topic_id}-${row.topic_name}`}>
                      <td className="px-3 py-3 font-semibold text-slate-900">{row.topic_id}</td>
                      <td className="px-3 py-3 text-slate-700">{row.topic_name}</td>
                      <td className="px-3 py-3 text-center font-extrabold text-teal-700">{row.question_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Chapter ID</th>
                    <th className="px-3 py-3 font-medium">Chapter Name</th>
                    <th className="px-3 py-3 font-medium">Question Format</th>
                    <th className="px-3 py-3 text-center font-medium">Question Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chapterRows.map((row) => (
                    <tr key={`${row.chapter_id}-${row.question_format}`}>
                      <td className="px-3 py-3 font-semibold text-slate-900">{row.chapter_id}</td>
                      <td className="px-3 py-3 text-slate-700">{row.chapter_name}</td>
                      <td className="px-3 py-3 font-medium text-violet-600">{row.question_format}</td>
                      <td className="px-3 py-3 text-center font-extrabold text-orange-700">{row.question_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
