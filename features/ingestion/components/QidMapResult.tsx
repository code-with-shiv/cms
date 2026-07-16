"use client";

import { LuDownload } from "react-icons/lu";

interface QidMapResultProps {
  message: string;
  qidMap: Record<string, number | string>;
  onStartOver: () => void;
}

function downloadCsv(qidMap: Record<string, number | string>) {
  const rows = [["question_id", "qid"], ...Object.entries(qidMap).map(([k, v]) => [k, String(v)])];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "qid_map.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function QidMapResult({ message, qidMap, onStartOver }: QidMapResultProps) {
  const entries = Object.entries(qidMap);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-emerald-800">{message}</p>
        <div className="flex items-center gap-2">
          {entries.length ? (
            <button
              onClick={() => downloadCsv(qidMap)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <LuDownload className="h-3.5 w-3.5" /> Download CSV
            </button>
          ) : null}
          <button
            onClick={onStartOver}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Ingest another file
          </button>
        </div>
      </div>

      {entries.length ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-emerald-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-emerald-100 text-emerald-800">
              <tr>
                <th className="px-3 py-2 font-semibold">Question ID</th>
                <th className="px-3 py-2 font-semibold">QID</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([qId, qid]) => (
                <tr key={qId} className="border-t border-emerald-100">
                  <td className="px-3 py-1.5 font-mono">{qId}</td>
                  <td className="px-3 py-1.5 font-mono">{qid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-emerald-700">No QIDs were returned for this batch.</p>
      )}
    </div>
  );
}
