import Image from "next/image";
import Link from "next/link";
import { LuHouse, LuTriangleAlert } from "react-icons/lu";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Image
            src="/acadally_logo.png"
            alt="Acadally"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <p className="text-sm font-semibold text-slate-900">Acadally CMS</p>
        </div>

        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
          <LuTriangleAlert className="h-6 w-6 text-indigo-600" />
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-slate-900">404</h1>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">Page not found</h2>
        <p className="mt-1 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <LuHouse className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Acadally · Education CMS</p>
    </div>
  );
}
