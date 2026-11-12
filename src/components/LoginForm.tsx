"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { IconAlert, IconEye, IconEyeOff } from "./icons";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Masukkan username dan password Anda.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Gagal masuk ke sistem. Periksa kembali kredensial Anda.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(demoUser: string, demoPass: string) {
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[6px] border px-3.5 py-3 text-sm font-medium"
            style={{
              backgroundColor: "var(--status-err-bg)",
              borderColor: "var(--status-err-fg)",
              color: "var(--status-err-fg)",
            }}
          >
            <IconAlert className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="login-username"
            className="mb-1.5 block text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Username
          </label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Masukkan username (misal: admin atau staff)"
            className="min-h-[44px] w-full rounded-[6px] border px-3.5 py-2 text-sm"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-control)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Password
          </label>
          <div className="relative flex items-center">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="min-h-[44px] w-full rounded-[6px] border py-2 pl-3.5 pr-12 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              className="absolute right-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-[6px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent inline-flex min-h-[44px] w-full items-center justify-center rounded-[6px] px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Memverifikasi akun..." : "Masuk ke Sistem"}
        </button>
      </form>

      <div
        className="rounded-[6px] border p-4"
        style={{
          backgroundColor: "var(--bg-subtle)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Akun Demo Pengujian
        </p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => fillDemoAccount("admin", "admin123")}
            className="btn-surface flex min-h-[44px] flex-col items-start justify-center rounded-[6px] border px-3 py-2 text-left text-xs"
          >
            <span className="font-semibold">Isi Akun Admin</span>
            <span className="font-mono-code mt-0.5" style={{ color: "var(--text-secondary)" }}>
              admin / admin123
            </span>
          </button>

          <button
            type="button"
            onClick={() => fillDemoAccount("staff", "staff123")}
            className="btn-surface flex min-h-[44px] flex-col items-start justify-center rounded-[6px] border px-3 py-2 text-left text-xs"
          >
            <span className="font-semibold">Isi Akun Staff</span>
            <span className="font-mono-code mt-0.5" style={{ color: "var(--text-secondary)" }}>
              staff / staff123
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

