import type { ContentItem } from "@/types/question";

// A question's question/solution/hint/option fields are each an array of
// typed content blocks (text/image/...). The editor works against a plain
// textarea string, so these convert between the two, preserving any
// non-text blocks (e.g. images) already present.

export function contentBlocksToText(blocks: ContentItem[] | undefined | null): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((block) => block && typeof block === "object" && typeof block.content === "string")
    .map((block) => block.content as string)
    .join(" ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Per-block editing helpers (question/option/dr/solution/hint are each edited
// as an array of independent blocks, not one flattened string) — pure array
// operations so callers just replace their state with the returned array.

export function insertBlockAbove(blocks: ContentItem[], index: number, content: string): ContentItem[] {
  const next = [...blocks];
  next.splice(index, 0, { type: "text", content });
  return next;
}

export function insertBlockBelow(blocks: ContentItem[], index: number, content: string): ContentItem[] {
  const next = [...blocks];
  next.splice(index + 1, 0, { type: "text", content });
  return next;
}

export function removeBlockAt(blocks: ContentItem[], index: number): ContentItem[] {
  return blocks.filter((_, i) => i !== index);
}
