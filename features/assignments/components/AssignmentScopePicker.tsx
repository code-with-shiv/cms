"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import {
  getBoards,
  getChapters,
  getGrades,
  getLearningUnits,
  getSubjects,
  getTopics,
} from "@/features/metadata/services/metadata.service";
import type { ChapterOption, LearningUnitOption, TopicOption } from "@/types/metadata";
import type { AssignmentLevel, AssignmentScope } from "@/types/assignment";

interface AssignmentScopePickerProps {
  level: AssignmentLevel | "";
  value: AssignmentScope;
  onChange: (next: AssignmentScope) => void;
}

export function AssignmentScopePicker({ level, value, onChange }: AssignmentScopePickerProps) {
  const [boards, setBoards] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [learningUnits, setLearningUnits] = useState<LearningUnitOption[]>([]);

  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingLUs, setIsLoadingLUs] = useState(false);

  const [error, setError] = useState("");

  const needsTopic = level === "topic" || level === "lu";
  const needsLU = level === "lu";

  useEffect(() => {
    let cancelled = false;
    setIsLoadingBoards(true);
    getBoards()
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load boards.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBoards(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!value.board) {
      setGrades([]);
      return;
    }
    let cancelled = false;
    setIsLoadingGrades(true);
    getGrades(value.board)
      .then((data) => {
        if (!cancelled) setGrades(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load grades.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGrades(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.board]);

  useEffect(() => {
    if (!value.board || !value.grade) {
      setSubjects([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSubjects(true);
    getSubjects(value.board, value.grade)
      .then((data) => {
        if (!cancelled) setSubjects(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load subjects.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSubjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.board, value.grade]);

  useEffect(() => {
    if (!value.board || !value.grade || !value.subject) {
      setChapters([]);
      return;
    }
    let cancelled = false;
    setIsLoadingChapters(true);
    getChapters(value.board, value.grade, value.subject)
      .then((data) => {
        if (!cancelled) setChapters(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load chapters.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingChapters(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.board, value.grade, value.subject]);

  useEffect(() => {
    if (!needsTopic || !value.chapter_id) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setIsLoadingTopics(true);
    getTopics(value.chapter_id)
      .then((data) => {
        if (!cancelled) setTopics(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load topics.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTopics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsTopic, value.chapter_id]);

  useEffect(() => {
    if (!needsLU || !value.topic_id) {
      setLearningUnits([]);
      return;
    }
    let cancelled = false;
    setIsLoadingLUs(true);
    getLearningUnits(value.topic_id)
      .then((data) => {
        if (!cancelled) setLearningUnits(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load learning units.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLUs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsLU, value.topic_id]);

  function update(patch: Partial<AssignmentScope>) {
    onChange({ ...value, ...patch });
  }

  function handleBoardChange(board: string) {
    update({
      board,
      grade: "",
      subject: "",
      chapter_id: "",
      chapter_name: "",
      topic_id: "",
      topic_name: "",
      luid: "",
      lu_name: "",
    });
  }

  function handleGradeChange(grade: string) {
    update({
      grade,
      subject: "",
      chapter_id: "",
      chapter_name: "",
      topic_id: "",
      topic_name: "",
      luid: "",
      lu_name: "",
    });
  }

  function handleSubjectChange(subject: string) {
    update({
      subject,
      chapter_id: "",
      chapter_name: "",
      topic_id: "",
      topic_name: "",
      luid: "",
      lu_name: "",
    });
  }

  function handleChapterChange(chapterId: string) {
    const chapter = chapters.find((c) => String(c.chapter_id) === chapterId);
    update({
      chapter_id: chapterId,
      chapter_name: chapter?.chapter_name ?? "",
      topic_id: "",
      topic_name: "",
      luid: "",
      lu_name: "",
    });
  }

  function handleTopicChange(topicId: string) {
    const topic = topics.find((t) => String(t.topic_id) === topicId);
    update({ topic_id: topicId, topic_name: topic?.topic_name ?? "", luid: "", lu_name: "" });
  }

  function handleLUChange(luid: string) {
    const lu = learningUnits.find((l) => l.luid === luid);
    update({ luid, lu_name: lu?.lu_name ?? lu?.lu ?? "" });
  }

  if (!level) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
        Select a template and level above to choose a scope.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Board <span className="text-red-500">*</span>
          </label>
          <Select
            value={value.board}
            onChange={(e) => handleBoardChange(e.target.value)}
            disabled={isLoadingBoards}
          >
            <option value="">{isLoadingBoards ? "Loading…" : "Select board…"}</option>
            {boards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Grade <span className="text-red-500">*</span>
          </label>
          <Select
            value={value.grade}
            onChange={(e) => handleGradeChange(e.target.value)}
            disabled={!value.board || isLoadingGrades}
          >
            <option value="">{isLoadingGrades ? "Loading…" : "Select grade…"}</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Subject <span className="text-red-500">*</span>
          </label>
          <Select
            value={value.subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={!value.grade || isLoadingSubjects}
          >
            <option value="">{isLoadingSubjects ? "Loading…" : "Select subject…"}</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${needsTopic ? "sm:grid-cols-2" : ""}`}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Chapter <span className="text-red-500">*</span>
          </label>
          <Select
            value={value.chapter_id}
            onChange={(e) => handleChapterChange(e.target.value)}
            disabled={!value.subject || isLoadingChapters}
          >
            <option value="">{isLoadingChapters ? "Loading…" : "Select chapter…"}</option>
            {chapters.map((c) => (
              <option key={String(c.chapter_id)} value={String(c.chapter_id)}>
                {c.chapter_name}
              </option>
            ))}
          </Select>
        </div>
        {needsTopic ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Topic <span className="text-red-500">*</span>
            </label>
            <Select
              value={value.topic_id ?? ""}
              onChange={(e) => handleTopicChange(e.target.value)}
              disabled={!value.chapter_id || isLoadingTopics}
            >
              <option value="">{isLoadingTopics ? "Loading…" : "Select topic…"}</option>
              {topics.map((t) => (
                <option key={String(t.topic_id)} value={String(t.topic_id)}>
                  {t.topic_name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {needsLU ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Learning Unit <span className="text-red-500">*</span>
          </label>
          <Select
            value={value.luid ?? ""}
            onChange={(e) => handleLUChange(e.target.value)}
            disabled={!value.topic_id || isLoadingLUs}
          >
            <option value="">{isLoadingLUs ? "Loading…" : "Select learning unit…"}</option>
            {learningUnits.map((lu) => (
              <option key={lu.luid} value={lu.luid}>
                {lu.lu_name ?? lu.lu ?? lu.luid}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </div>
  );
}
