const SHIMMER_WIDTHS = [
  "w-[82%]",
  "w-[70%]",
  "w-[88%]",
  "w-[64%]",
  "w-[76%]",
  "w-[84%]",
  "w-[68%]",
  "w-[90%]",
  "w-[72%]",
  "w-[80%]",
];

function ShimmerBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

export function QuestionsTableShimmer() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Loading questions" aria-busy="true">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">Question</th>
              <th className="px-3 py-2.5">Is Clone</th>
              <th className="px-3 py-2.5">Is Clone Of</th>
              <th className="px-3 py-2.5">Difficulty</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Updated</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SHIMMER_WIDTHS.map((width, index) => (
              <tr key={index}>
                <td className="px-3 py-4 align-top">
                  <ShimmerBlock className="h-6 w-16" />
                </td>
                <td className="px-3 py-4">
                  <div className="max-w-[395px] space-y-2">
                    <ShimmerBlock className={`h-4 ${width}`} />
                    <ShimmerBlock className="h-3 w-44" />
                  </div>
                </td>
                <td className="px-3 py-4 align-top">
                  <ShimmerBlock className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-3 py-4 align-top">
                  <ShimmerBlock className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-3 py-4 align-top">
                  <ShimmerBlock className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-3 py-4 align-top">
                  <ShimmerBlock className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-3 py-4 align-top">
                  <ShimmerBlock className="h-4 w-20" />
                </td>
                <td className="px-3 py-4 align-top">
                  <ShimmerBlock className="h-4 w-14" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
