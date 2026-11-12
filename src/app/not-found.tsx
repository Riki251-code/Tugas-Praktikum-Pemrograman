import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-12">
      <section
        className="w-full rounded-[8px] border p-6 text-center space-y-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <p className="font-mono-code text-sm font-semibold" style={{ color: "var(--accent-text)" }}>
          404
        </p>
        <h1 className="text-2xl font-bold">Halaman Tidak Ditemukan</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Alamat halaman yang Anda buka tidak tersedia di sistem LabTrack.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[6px] px-5 text-sm font-semibold"
          style={{
            backgroundColor: "var(--brand-primary)",
            color: "var(--brand-fg)",
          }}
        >
          Kembali ke Dashboard
        </Link>
      </section>
    </main>
  );
}

