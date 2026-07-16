"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { getBoards, getChapters, getGrades, getSubjects } from "@/features/metadata/services/metadata.service";
import type { ChapterOption } from "@/types/metadata";

export interface ChapterScope {
  board: string;
  grade: string;
  subject: string;
  chapter_name: string;
}

interface ChapterScopePickerProps {
  value: ChapterScope;
  onChange: (next: ChapterScope) => void;
}

export function ChapterScopePicker({ value, onChange }: ChapterScopePickerProps) {
  const [boards, setBoards] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);

  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  const [error, setError] = useState("");

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

  function update(patch: Partial<ChapterScope>) {
    onChange({ ...value, ...patch });
  }

  function handleBoardChange(board: string) {
    update({ board, grade: "", subject: "", chapter_name: "" });
  }

  function handleGradeChange(grade: string) {
    update({ grade, subject: "", chapter_name: "" });
  }

  function handleSubjectChange(subject: string) {
    update({ subject, chapter_name: "" });
  }

  function handleChapterChange(chapterName: string) {
    update({ chapter_name: chapterName });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Chapter <span className="text-red-500">*</span>
          </label>
          <Select
            value={value.chapter_name}
            onChange={(e) => handleChapterChange(e.target.value)}
            disabled={!value.subject || isLoadingChapters}
          >
            <option value="">{isLoadingChapters ? "Loading…" : "Select chapter…"}</option>
            {chapters.map((c) => (
              <option key={String(c.chapter_id)} value={c.chapter_name}>
                {c.chapter_name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
