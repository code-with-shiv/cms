"use client";

import Script from "next/script";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      texReset?: () => void;
      typesetClear?: () => void;
    };
  }
}

const MATHJAX_CONFIG = {
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
  },
  chtml: { mtextInheritFont: true },
  options: {
    includeHtmlTags: { br: "\n", wbr: "", "#comment": "" },
  },
};

// next_app's RenderInline.tsx calls window.MathJax.typesetPromise(...) but
// never actually loads MathJax anywhere, so math rendering was silently
// broken there. This mounts the script once (app/layout.tsx) and signals
// readiness via a "mathjax-ready" window event so any RenderInline instance
// that rendered before the script finished loading can retry its typeset.
export function MathJaxLoader() {
  return (
    <>
      <Script id="mathjax-config" strategy="beforeInteractive">
        {`window.MathJax = ${JSON.stringify(MATHJAX_CONFIG)};`}
      </Script>
      <Script
        id="mathjax-script"
        src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
        strategy="afterInteractive"
        onLoad={() => window.dispatchEvent(new Event("mathjax-ready"))}
      />
    </>
  );
}
