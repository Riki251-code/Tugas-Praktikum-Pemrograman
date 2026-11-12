"use client";

import { FormEvent, useCallback, useState } from "react";
import { formatDateId } from "@/lib/format";
import { AppUser } from "@/lib/types";
import { IconAlert, IconCheck, IconEdit, IconPlus } from "./icons";
import { ModalDialog } from "./ModalDialog";
import { StatusBadge } from "./StatusBadge";

interface PenggunaClientProps {
  currentUser: AppUser;
  initialUsers: AppUser[];
}

interface UserFormState {
  fullName: string;
  username: string;
  password: string;
  isActive: boolean;
}

const EMPTY_USER_FORM: UserFormState = {
  fullName: "",
  username: "",
  password: "",
  isActive: true,
};

export function PenggunaClient({ currentUser, initialUsers }: PenggunaClientProps) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formState, setFormState] = useState<UserFormState>(EMPTY_USER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Gagal memuat daftar pengguna.");
        return;
      }
      setUsers((data?.users ?? []) as AppUser[]);
    } catch {
      setError("Koneksi gagal saat memuat daftar pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  function openCreateStaff() {
    setEditingUser(null);
    setFormState(EMPTY_USER_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditUser(target: AppUser) {
    setEditingUser(target);
    setFormState({
      fullName: target.fullName,
      username: target.username,
      password: "",
      isActive: target.isActive,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!formState.fullName.trim() || !formState.username.trim()) {
      setFormError("Nama lengkap dan username wajib diisi.");
      return;
    }
    if (!editingUser && formState.password.length < 6) {
      setFormError("Password akun Staff minimal 6 karakter.");
      return;
    }
    if (editingUser && formState.password && formState.password.length < 6) {
      setFormError("Password baru minimal 6 karakter.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";
      const payload = editingUser
        ? {
            fullName: formState.fullName.trim(),
            username: formState.username.trim().toLowerCase(),
            ...(formState.password ? { password: formState.password } : {}),
          }
        : {
            fullName: formState.fullName.trim(),
            username: formState.username.trim().toLowerCase(),
            password: formState.password,
            role: "staff",
            isActive: formState.isActive,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(data?.error ?? "Gagal menyimpan data pengguna.");
        return;
      }

      setFormOpen(false);
      setFeedback(
        editingUser
          ? `Data pengguna ${data.user.fullName} berhasil diperbarui.`
          : `Akun Staff ${data.user.fullName} (@${data.user.username}) berhasil ditambahkan.`,
      );
      await loadUsers();
    } catch {
      setFormError("Gagal menghubungi server saat menyimpan akun.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(target: AppUser) {
    setError(null);
    setFeedback(null);
    setTogglingId(target.id);
    try {
      const response = await fetch(`/api/users/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !target.isActive }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Gagal mengubah status akun.");
        return;
      }
      setFeedback(
        `Akun ${data.user.fullName} sekarang berstatus ${data.user.isActive ? "Aktif" : "Nonaktif"}.`,
      );
      await loadUsers();
    } catch {
      setError("Koneksi terputus saat mengubah status akun.");
    } finally {
      setTogglingId(null);
    }
  }

  const staffCount = users.filter((u) => u.role === "staff").length;
  const activeStaffCount = users.filter((u) => u.role === "staff" && u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Manajemen Pengguna &amp; Akun Staff
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Tambahkan petugas lab baru, ubah informasi akun, atau aktif/nonaktifkan akses Staff ({activeStaffCount} dari {staffCount} Staff aktif).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateStaff}
          className="btn-accent inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] px-4 text-sm font-semibold self-start sm:self-auto"
        >
          <IconPlus className="shrink-0" />
          <span>Tambah Akun Staff</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-[8px] border px-4 py-3 text-sm font-medium"
          style={{
            backgroundColor: "var(--status-ok-bg)",
            borderColor: "var(--status-ok-fg)",
            color: "var(--status-ok-fg)",
          }}
        >
          <div className="flex items-center gap-2">
            <IconCheck />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="min-h-[44px] shrink-0 px-2 text-xs font-bold underline hover:opacity-80"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[8px] border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundColor: "var(--status-err-bg)",
            borderColor: "var(--status-err-fg)",
            color: "var(--status-err-fg)",
          }}
        >
          <div className="flex items-start gap-2 text-sm font-medium">
            <IconAlert className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="btn-surface min-h-[44px] shrink-0 whitespace-nowrap rounded-[6px] border px-3 text-sm font-semibold"
            style={{ borderColor: "var(--status-err-fg)" }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[8px] border p-8 text-center text-sm"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          Memuat daftar pengguna...
        </div>
      ) : users.length === 0 ? (
        <div
          className="rounded-[8px] border p-8 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <p className="text-base font-bold">Belum ada akun terdaftar</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Tambahkan akun Staff pertama untuk mulai mencatat operasional lab.
          </p>
        </div>
      ) : (
        <>
          <div
            className="hidden md:block overflow-x-auto rounded-[8px] border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr
                  className="border-b text-xs uppercase tracking-wide"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Dibuat</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="table-row-hover">
                      <td className="px-4 py-3.5 align-middle font-semibold">
                        {u.fullName}{" "}
                        {isSelf && (
                          <span className="text-xs font-normal" style={{ color: "var(--text-secondary)" }}>
                            (Anda)
                          </span>
                        )}
                      </td>
                      <td className="font-mono-code px-4 py-3.5 align-middle text-xs whitespace-nowrap">
                        @{u.username}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <StatusBadge
                          tone={u.role === "admin" ? "warn" : "neutral"}
                          label={u.role === "admin" ? "ADMIN" : "STAFF"}
                          withIcon={false}
                        />
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <StatusBadge
                          tone={u.isActive ? "ok" : "err"}
                          label={u.isActive ? "Aktif" : "Nonaktif"}
                        />
                      </td>
                      <td className="px-4 py-3.5 align-middle text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {formatDateId(u.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditUser(u)}
                            className="btn-surface inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-3 text-xs font-semibold"
                          >
                            <IconEdit />
                            <span>Edit</span>
                          </button>

                          {u.role === "staff" && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              disabled={togglingId === u.id}
                              className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-[6px] border px-3 text-xs font-semibold disabled:opacity-60 ${
                                u.isActive ? "btn-danger-tint" : "btn-ok-tint"
                              }`}
                            >
                              {togglingId === u.id
                                ? "Memproses..."
                                : u.isActive
                                  ? "Nonaktifkan"
                                  : "Aktifkan"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id;
              return (
                <article
                  key={u.id}
                  className="rounded-[8px] border p-4 space-y-3"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold">
                        {u.fullName} {isSelf ? "(Anda)" : ""}
                      </h2>
                      <p className="font-mono-code text-xs" style={{ color: "var(--text-secondary)" }}>
                        @{u.username}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge
                        tone={u.role === "admin" ? "warn" : "neutral"}
                        label={u.role === "admin" ? "ADMIN" : "STAFF"}
                        withIcon={false}
                      />
                      <StatusBadge
                        tone={u.isActive ? "ok" : "err"}
                        label={u.isActive ? "Aktif" : "Nonaktif"}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditUser(u)}
                      className="btn-surface inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold"
                    >
                      <IconEdit />
                      <span>Edit</span>
                    </button>
                    {u.role === "staff" && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        disabled={togglingId === u.id}
                        className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-[6px] border px-3 text-sm font-semibold disabled:opacity-60 ${
                          u.isActive ? "btn-danger-tint" : "btn-ok-tint"
                        }`}
                      >
                        {togglingId === u.id
                          ? "Memproses..."
                          : u.isActive
                            ? "Nonaktifkan"
                            : "Aktifkan"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ModalDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingUser ? `Edit Pengguna (@${editingUser.username})` : "Tambah Akun Staff"}
        description={
          editingUser
            ? "Ubah nama, username, atau isi password baru jika ingin mengatur ulang kata sandi."
            : "Akun Staff memiliki akses operasional peminjaman, pengembalian, dan melihat stok."
        }
      >
        <form onSubmit={handleSubmitUser} className="space-y-4" noValidate>
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[6px] border px-3 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: "var(--status-err-bg)",
                borderColor: "var(--status-err-fg)",
                color: "var(--status-err-fg)",
              }}
            >
              <IconAlert className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label htmlFor="user-fullname" className="mb-1.5 block text-sm font-semibold">
              Nama Lengkap
            </label>
            <input
              id="user-fullname"
              type="text"
              required
              value={formState.fullName}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, fullName: e.target.value }))
              }
              placeholder="Contoh: Petugas Lab Jaringan"
              className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label htmlFor="user-username" className="mb-1.5 block text-sm font-semibold">
              Username
            </label>
            <input
              id="user-username"
              type="text"
              required
              value={formState.username}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, username: e.target.value }))
              }
              placeholder="Contoh: staff.jaringan"
              className="font-mono-code min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label htmlFor="user-password" className="mb-1.5 block text-sm font-semibold">
              {editingUser ? "Password Baru (Opsional)" : "Password"}
            </label>
            <input
              id="user-password"
              type="password"
              required={!editingUser}
              value={formState.password}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder={
                editingUser
                  ? "Kosongkan jika tidak ingin mengubah password"
                  : "Minimal 6 karakter"
              }
              className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {!editingUser && (
            <label className="flex min-h-[44px] items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="h-4 w-4"
              />
              <span>Aktifkan akun segera setelah dibuat</span>
            </label>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn-surface min-h-[44px] rounded-[6px] border px-4 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-accent min-h-[44px] rounded-[6px] px-4 text-sm font-semibold disabled:opacity-60"
            >
              {saving
                ? "Menyimpan..."
                : editingUser
                  ? "Simpan Perubahan"
                  : "Buat Akun Staff"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

