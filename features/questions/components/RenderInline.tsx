"use client";

import { useEffect, useRef } from "react";
import { marked } from "marked";

interface RenderInlineProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
}

// Ported from next_app's markdown+LaTeX pipeline. The preprocessing steps
// below (LaTeX protection, list-marker extraction, table reconstruction) are
// hard-won fixes for how `marked` mangles LaTeX/nested-list/table content —
// kept close to the original rather than rewritten.
function processContent(text: string): string {
  if (!text) return "";

  let processedText = text.replace(/\\\(₹\\\)/g, "₹");

  const latexProtectionMap: Record<string, string> = {};
  let protectionIndex = 0;

  processedText = processedText.replace(
    /\\{1,2}\([\s\S]*?\\{1,2}\)|\\{1,2}\[[\s\S]*?\\{1,2}\]|\$[^$]*\$/g,
    (match) => {
      const placeholder = `__LATEX_PROTECT_${protectionIndex}__`;
      latexProtectionMap[placeholder] = match;
      protectionIndex++;
      return placeholder;
    },
  );

  processedText = processedText.replace(/\\n/g, "\n");
  processedText = processedText.replace(/\\r\\n/g, "\n");
  processedText = processedText.replace(/\\r/g, "\n");

  Object.keys(latexProtectionMap).forEach((placeholder) => {
    processedText = processedText.replace(placeholder, latexProtectionMap[placeholder]);
  });

  processedText = processedText
    .replace(/\\ncong(?!\w)/g, "\\not\\cong")
    .replace(/\\nequiv(?!\w)/g, "\\not\\equiv")
    .replace(/\\nsim(?!\w)/g, "\\not\\sim")
    .replace(/\\mathbf\{\\bigtriangleup\}\\mathbf\{([A-Z]+)\}/g, "\\triangle $1")
    .replace(/\\mathbf\{\\bigtriangleup\}([A-Z]+)/g, "\\triangle $1")
    .replace(/\\mathbf\{\\bigtriangleup\}/g, "\\triangle")
    .replace(/\\bigtriangleup\\mathbf\{([A-Z]+)\}/g, "\\triangle $1")
    .replace(/\\bigtriangleup([A-Z]+)/g, "\\triangle $1")
    .replace(/\\bigtriangleup/g, "\\triangle")
    .replace(
      /\\angle\\mathbf\{([A-Z]+)\}\\mathbf\{([+\-=])\}\\angle\\mathbf\{([A-Z]+)\}/g,
      "\\angle $1 $2 \\angle $3",
    )
    .replace(
      /\\mathbf\{\\angle\}\\mathbf\{([A-Z]+)\}\\mathbf\{([+\-=])\s*\\angle\}\\mathbf\{([A-Z]+)\}/g,
      "\\angle $1 $2 \\angle $3",
    )
    .replace(/\\mathbf\{\\angle\}\\mathbf\{([A-Z]+)\}/g, "\\angle $1")
    .replace(/\\mathbf\{\\angle\}/g, "\\angle")
    .replace(/\\angle\\mathbf\{([A-Z]+)\}/g, "\\angle $1")
    .replace(/\\mathbf\{([0-9]+)\}\{\^\\circ\}/g, "$1^{\\circ}")
    .replace(/\\mathbf\{([0-9]+)\}\{\\^\\circ\}/g, "$1^{\\circ}")
    .replace(/\\mathbf\{([0-9]+)\}\^\{\\circ\}/g, "$1^{\\circ}")
    .replace(/\{\\^\\circ\}/g, "^{\\circ}")
    .replace(/\{\^\\circ\}/g, "^{\\circ}")
    .replace(/\\mathbf\{([+\-=])\}/g, " $1 ")
    .replace(/\\mathbf\{([0-9]+)\}/g, "$1")
    .replace(/\\mathbf\{([A-Z])\}\\mathbf\{([A-Z])\}\\mathbf\{([A-Z])\}/g, "$1$2$3")
    .replace(/\\mathbf\{([A-Z])\}\\mathbf\{([A-Z])\}/g, "$1$2")
    .replace(/\\mathbf\{([A-Z]+)\}/g, "$1")
    .replace(/\\mathbf\{([^}]{1,5})\}/g, "$1")
    .replace(/\\mathbf\{([^}]+)\}/g, "\\mathrm{$1}")
    .replace(/\\\\ \\cong \\\\ /g, " \\cong ")
    .replace(/\\Rightarrow/g, "\\Rightarrow")
    .trim();

  const originalNumbers: Array<{
    index: number;
    number: string;
    isAlphaUpper: boolean;
    isAlphaLower: boolean;
    isRomanLower: boolean;
    isRomanUpper: boolean;
  }> = [];
  let numberIndex = 0;

  const isRomanNumeral = (s: string): boolean =>
    /^[ivxlcdm]+$/i.test(s) &&
    (() => {
      const map: Record<string, number> = {
        m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1,
      };
      let val = 0;
      let i = 0;
      const lower = s.toLowerCase();
      while (i < lower.length) {
        if (i + 1 < lower.length && map[lower.slice(i, i + 2)]) {
          val += map[lower.slice(i, i + 2)];
          i += 2;
        } else if (map[lower[i]]) {
          val += map[lower[i]];
          i++;
        } else {
          return false;
        }
      }
      return val > 0;
    })();

  const romanToInt = (letter: string): number => {
    const map: Record<string, number> = {
      m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1,
    };
    let val = 0;
    let i = 0;
    const lower = letter.toLowerCase();
    while (i < lower.length) {
      if (i + 1 < lower.length && map[lower.slice(i, i + 2)]) {
        val += map[lower.slice(i, i + 2)];
        i += 2;
      } else if (map[lower[i]]) {
        val += map[lower[i]];
        i++;
      } else {
        i++;
      }
    }
    return val;
  };

  processedText = processedText.replace(/^(\s*)(\d+)\.\s+/gm, (_match, indent, number) => {
    originalNumbers.push({
      index: numberIndex++,
      number,
      isAlphaUpper: false,
      isAlphaLower: false,
      isRomanLower: false,
      isRomanUpper: false,
    });
    return `${indent}${number}. [ORIG_NUM_${numberIndex - 1}]`;
  });

  processedText = processedText.replace(/^(\s*)([A-Z]+)\.\s+/gm, (_match, indent, letter) => {
    const isRomanU = isRomanNumeral(letter);
    originalNumbers.push({
      index: numberIndex++,
      number: letter,
      isAlphaUpper: !isRomanU,
      isAlphaLower: false,
      isRomanLower: false,
      isRomanUpper: isRomanU,
    });
    const letterToNum = isRomanU
      ? romanToInt(letter)
      : letter.split("").reduce((acc: number, char: string) => acc * 26 + (char.charCodeAt(0) - 64), 0);
    const tag = isRomanU ? "[ROMAN_UPPER]" : "[ALPHA_UPPER]";
    return `${indent}${letterToNum}. [ORIG_NUM_${numberIndex - 1}]${tag}`;
  });

  processedText = processedText.replace(/^(\s*)([a-z]+)\.\s+/gm, (_match, indent, letter) => {
    const isRomanL = isRomanNumeral(letter);
    originalNumbers.push({
      index: numberIndex++,
      number: letter,
      isAlphaUpper: false,
      isAlphaLower: !isRomanL,
      isRomanLower: isRomanL,
      isRomanUpper: false,
    });
    const letterToNum = isRomanL
      ? romanToInt(letter)
      : letter.split("").reduce((acc: number, char: string) => acc * 26 + (char.charCodeAt(0) - 96), 0);
    const tag = isRomanL ? "[ROMAN_LOWER]" : "[ALPHA_LOWER]";
    return `${indent}${letterToNum}. [ORIG_NUM_${numberIndex - 1}]${tag}`;
  });

  processedText = processedText.replace(/[ \t]+\n/g, "\n").replace(/^\s+|\s+$/g, "");

  processedText = processedText.replace(/^([ \t]+)(\d+\.|[a-zA-Z]+\.|-|\*)\s/gm, (_match, indent, marker) => {
    const spaces = indent.replace(/\t/g, "  ");
    const indentLevel = Math.max(1, Math.round(spaces.length / 2));
    const normalizedIndent = "    ".repeat(indentLevel);
    return `${normalizedIndent}${marker} `;
  });

  const latexPlaceholders: Record<string, string> = {};
  let placeholderCount = 0;
  const createPlaceholder = (count: number) => `LATEXPLACEHOLDER${count}ENDPLACEHOLDER`;

  processedText = processedText.replace(/\\{1,2}\([\s\S]*?\\{1,2}\)/g, (match) => {
    const placeholder = createPlaceholder(placeholderCount);
    latexPlaceholders[placeholder] = match;
    placeholderCount++;
    return placeholder;
  });

  processedText = processedText.replace(/\\{1,2}\[[\s\S]*?\\{1,2}\]/g, (match) => {
    const placeholder = createPlaceholder(placeholderCount);
    latexPlaceholders[placeholder] = match;
    placeholderCount++;
    return placeholder;
  });

  processedText = processedText.replace(/\$[^$]*\$/g, (match) => {
    const placeholder = createPlaceholder(placeholderCount);
    latexPlaceholders[placeholder] = match;
    placeholderCount++;
    return placeholder;
  });

  const isTableContent = processedText.includes("|") && (processedText.includes("---") || processedText.includes("==="));

  if (isTableContent) {
    const lines = processedText.split("\n");
    const beforeTable: string[] = [];
    const tableLines: string[] = [];
    const afterTable: string[] = [];
    let inTable = false;
    let tableEnded = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.includes("|") && !tableEnded) {
        inTable = true;
        tableLines.push(rawLine);
      } else if (inTable && line === "") {
        tableLines.push(rawLine);
      } else if (inTable && !line.includes("|")) {
        tableEnded = true;
        inTable = false;
        afterTable.push(rawLine);
      } else if (!inTable && !tableEnded) {
        beforeTable.push(rawLine);
      } else {
        afterTable.push(rawLine);
      }
    }

    let reconstructed = "";
    if (beforeTable.length > 0) reconstructed += `${beforeTable.join("\n\n")}\n\n`;
    if (tableLines.length > 0) reconstructed += `${tableLines.join("\n")}\n\n`;
    if (afterTable.length > 0) reconstructed += afterTable.join("\n\n");
    processedText = reconstructed.trim();
  }

  if (!isTableContent) {
    processedText = processedText.replace(/(\n){2,}/g, (match) => {
      const count = match.length;
      if (count > 2) return `\n\n${"<br>".repeat(count - 2)}`;
      return match;
    });
  }

  marked.setOptions({ breaks: true, gfm: true });
  processedText = marked.parse(processedText) as string;

  processedText = processedText.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  const markerRegex = /\[ORIG_NUM_(\d+)\](\[ALPHA_UPPER\]|\[ALPHA_LOWER\]|\[ROMAN_UPPER\]|\[ROMAN_LOWER\])?/g;
  let markerMatch;
  while ((markerMatch = markerRegex.exec(processedText)) !== null) {
    const idx = parseInt(markerMatch[1], 10);
    const origNumData = originalNumbers[idx];
    if (origNumData) {
      const markerPos = markerMatch.index;
      const beforeMarker = processedText.substring(0, markerPos);
      const lastLiOpen = beforeMarker.lastIndexOf("<li>");
      const lastLiOpenWithAttr = beforeMarker.lastIndexOf("<li ");
      const liPos = Math.max(lastLiOpen, lastLiOpenWithAttr);

      if (liPos !== -1) {
        const liTag = processedText.substring(liPos, processedText.indexOf(">", liPos) + 1);
        if (!liTag.includes("data-orig-number")) {
          const dataAttr = `data-orig-number="${origNumData.number}" data-is-alpha-upper="${origNumData.isAlphaUpper}" data-is-alpha-lower="${origNumData.isAlphaLower}" data-is-roman-lower="${origNumData.isRomanLower}" data-is-roman-upper="${origNumData.isRomanUpper}"`;
          if (liTag === "<li>") {
            processedText = `${processedText.substring(0, liPos)}<li ${dataAttr}>${processedText.substring(liPos + 4)}`;
          } else {
            processedText = `${processedText.substring(0, liPos + 3)} ${dataAttr}${processedText.substring(liPos + 3)}`;
          }
          markerRegex.lastIndex = 0;
        }
      }
    }
  }

  processedText = processedText.replace(/\[ORIG_NUM_\d+\](\[ALPHA_UPPER\]|\[ALPHA_LOWER\]|\[ROMAN_LOWER\]|\[ROMAN_UPPER\])?\s*/g, "");
  processedText = processedText.replace(/\[ORIG_NUM_\d+\]/g, "");
  processedText = processedText.replace(/\[ALPHA_UPPER\]/g, "");
  processedText = processedText.replace(/\[ALPHA_LOWER\]/g, "");
  processedText = processedText.replace(/\[ROMAN_LOWER\]/g, "");
  processedText = processedText.replace(/\[ROMAN_UPPER\]/g, "");

  processedText = processedText.replace(
    /<li([^>]*)>\s*<blockquote>\s*<p>(.*?)<\/p>\s*<\/blockquote>\s*<\/li>/g,
    (_match, attrs, content) => `<li${attrs}>${content}</li>`,
  );
  processedText = processedText.replace(
    /<li([^>]*)>\s*<p>(.*?)<\/p>\s*<\/li>/g,
    (_match, attrs, content) => `<li${attrs}>${content}</li>`,
  );

  processedText = processedText.replace(/(<ol[^>]*>)([\s\S]*?)(<\/ol>)/g, (match, openTag, content, closeTag) => {
    const classes: string[] = [];
    if (content.includes('data-is-alpha-upper="true"')) classes.push("alpha-upper-list");
    if (content.includes('data-is-alpha-lower="true"')) classes.push("alpha-lower-list");
    if (content.includes('data-is-roman-lower="true"')) classes.push("roman-lower-list");
    if (content.includes('data-is-roman-upper="true"')) classes.push("roman-upper-list");
    if (classes.length > 0) {
      const classStr = classes.join(" ");
      const classAttr = openTag.includes("class=")
        ? openTag.replace(/class="([^"]*)"/, `class="$1 ${classStr}"`)
        : openTag.replace(/>/, ` class="${classStr}">`);
      return classAttr + content + closeTag;
    }
    return match;
  });

  processedText = processedText.replace(/<\/blockquote>\s*<p>/g, "</blockquote>\n<p>");

  Object.keys(latexPlaceholders).forEach((placeholder) => {
    processedText = processedText.replace(new RegExp(placeholder, "g"), latexPlaceholders[placeholder]);
  });

  return processedText;
}

export function RenderInline({ content, style = {}, className = "" }: RenderInlineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const pElements = node.querySelectorAll("p");
    pElements.forEach((p) => {
      p.style.margin = "0";
      p.style.marginBottom = "2px";
      p.style.padding = "0";
      p.style.lineHeight = "1.3";
    });

    const ulElements = node.querySelectorAll("ul");
    ulElements.forEach((ul) => {
      ul.style.marginLeft = "0";
      ul.style.paddingLeft = "30px";
      ul.style.listStylePosition = "outside";
      ul.style.listStyleType = "disc";
    });

    const liElements = node.querySelectorAll("li");
    liElements.forEach((li) => {
      li.style.marginBottom = "2px";
      li.style.display = "list-item";
      li.style.paddingLeft = "0";
      li.style.marginLeft = "0";

      li.querySelectorAll("blockquote").forEach((blockquote) => {
        const el = blockquote as HTMLElement;
        el.style.margin = "0";
        el.style.padding = "0";
        el.style.borderLeft = "none";
        el.style.display = "inline";
        el.style.fontStyle = "normal";
      });

      li.querySelectorAll("p").forEach((p) => {
        p.style.margin = "0";
        p.style.padding = "0";
        p.style.display = "inline";
      });
    });

    node.querySelectorAll("table").forEach((table) => {
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.margin = "15px 0";
      table.style.border = "1px solid #ddd";
    });

    node.querySelectorAll("th").forEach((th) => {
      th.style.border = "1px solid #ddd";
      th.style.padding = "12px 8px";
      th.style.backgroundColor = "#F8F9FA";
      th.style.fontWeight = "bold";
      th.style.textAlign = "left";
    });

    node.querySelectorAll("td").forEach((td) => {
      td.style.border = "1px solid #ddd";
      td.style.padding = "10px 8px";
      td.style.textAlign = "left";
    });

    function typeset() {
      if (node && window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise([node]).catch((err: unknown) => {
          console.error("MathJax typesetting failed:", err);
        });
      }
    }

    const timer = setTimeout(typeset, 200);
    // MathJax's script tag loads asynchronously (see MathJaxLoader) — if it
    // isn't ready yet on first render, retry once it dispatches this event.
    window.addEventListener("mathjax-ready", typeset);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mathjax-ready", typeset);
    };
  }, [content]);

  const html = processContent(content);

  const defaultStyle: React.CSSProperties = {
    maxWidth: "100%",
    overflow: "visible",
    wordBreak: "break-word",
    lineHeight: "1.3",
    fontFamily: '"Noto Sans Devanagari", "Nirmala UI", "Mangal", system-ui, sans-serif',
    padding: "5px",
    ...style,
  };

  return (
    <>
      <div style={{ overflowX: "auto", width: "100%" }}>
        <div
          ref={containerRef}
          className={`markdown-with-math ${className}`}
          style={defaultStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <style>{`
        .markdown-with-math img {
          display: block !important;
          max-width: 100% !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }
        .markdown-with-math table,
        .markdown-with-math table th,
        .markdown-with-math table td {
          border: 1px solid #ddd !important;
          border-collapse: collapse !important;
          background: #fff !important;
        }
        .markdown-with-math table {
          display: table !important;
          width: 100% !important;
          margin: 15px 0 !important;
          overflow-x: auto !important;
        }
        .markdown-with-math th {
          padding: 12px 8px !important;
          background-color: #F8F9FA !important;
          font-weight: bold !important;
          text-align: left !important;
        }
        .markdown-with-math td {
          padding: 10px 8px !important;
          text-align: left !important;
        }
        .markdown-with-math ul {
          margin: 0 !important;
          padding-left: 2em !important;
          line-height: 1.4 !important;
          list-style-type: disc !important;
        }
        .markdown-with-math ul li {
          margin-bottom: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .markdown-with-math li p {
          margin: 0 !important;
          padding: 0 !important;
          display: inline !important;
        }
        .markdown-with-math li > ul,
        .markdown-with-math li > ol {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-left: 2em !important;
        }
        .markdown-with-math ol {
          list-style: none !important;
          margin: 0 !important;
          padding-left: 2em !important;
          line-height: 1.4 !important;
          overflow: visible !important;
          counter-reset: list-counter !important;
        }
        .markdown-with-math ol li {
          padding-left: 0 !important;
          margin-left: 0 !important;
          margin-bottom: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          position: relative !important;
          display: block !important;
          overflow: visible !important;
          counter-increment: list-counter !important;
        }
        .markdown-with-math ol li::before {
          position: absolute !important;
          left: -2em !important;
          width: 1.8em !important;
          text-align: right !important;
        }
        .markdown-with-math ol li[data-orig-number]::before {
          content: attr(data-orig-number) ". " !important;
        }
        .markdown-with-math ol li:not([data-orig-number])::before {
          content: counter(list-counter) ". " !important;
        }
        .markdown-with-math ol.alpha-upper-list li[data-is-alpha-upper="true"]::before {
          content: attr(data-orig-number) ". " !important;
        }
        .markdown-with-math ol.alpha-lower-list li[data-is-alpha-lower="true"]::before {
          content: attr(data-orig-number) ". " !important;
        }
        .markdown-with-math ol li[data-is-roman-lower="true"]::before {
          content: attr(data-orig-number) ". " !important;
        }
        .markdown-with-math ol li[data-is-roman-upper="true"]::before {
          content: attr(data-orig-number) ". " !important;
        }
      `}</style>
    </>
  );
}
