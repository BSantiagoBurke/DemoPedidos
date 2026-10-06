import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta demo</h1>
      <p className="text-muted">Revisá el link o pedile uno nuevo a BeeCode.</p>
      <Link href="/" className="rounded-xl bg-ink px-5 py-3 font-semibold text-white">Ver demos</Link>
    </main>
  );
}
