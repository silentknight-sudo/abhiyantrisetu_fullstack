import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-background px-4 pt-[72px] text-center">
      <div>
        <p className="text-6xl font-extrabold text-orange-400">404</p>
        <h1 className="mt-4 text-2xl font-bold text-navy-600">
          This bridge doesn't go anywhere yet.
        </h1>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-navy-600 px-6 py-3 font-bold text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
