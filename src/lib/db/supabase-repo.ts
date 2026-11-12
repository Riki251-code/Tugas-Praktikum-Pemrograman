import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { hashPassword } from "../password";
import {
  ActivityLog,
  AppUser,
  BorrowingRecord,
  DashboardSummary,
  InventoryItem,
  UserRecord,
  UserRole,
} from "../types";
import { RepoError } from "./errors";
import {
  BorrowingCreateInput,
  BorrowingReturnInput,
  ItemInput,
  LabRepository,
  UserCreateInput,
  UserUpdateInput,
} from "./repo-interface";

interface DbUserRow {
  id: string;
  username: string;
  full_name: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DbItemRow {
  id: string;
  code: string;
  name: string;
  category: string;
  total_stock: number;
  available_stock: number;
  location: string;
  created_at: string;
  updated_at: string;
}

interface DbBorrowingRow {
  id: string;
  transaction_code: string;
  borrower_name: string;
  item_id: string | null;
  item_code_snapshot: string;
  item_name_snapshot: string;
  quantity: number;
  borrow_date: string;
  return_date: string | null;
  status: "dipinjam" | "selesai";
  notes: string;
  return_notes: string;
  recorded_by_id: string | null;
  recorded_by_name: string;
  returned_by_id: string | null;
  returned_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface DbActivityRow {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: UserRole;
  action_type: string;
  target_label: string;
  summary: string;
  scope: "operational" | "admin_only";
  created_at: string;
}

function mapUser(row: DbUserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserWithHash(row: DbUserRow): UserRecord {
  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}

function mapItem(row: DbItemRow): InventoryItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    totalStock: row.total_stock,
    availableStock: row.available_stock,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBorrowing(row: DbBorrowingRow): BorrowingRecord {
  return {
    id: row.id,
    transactionCode: row.transaction_code,
    borrowerName: row.borrower_name,
    itemId: row.item_id,
    itemCode: row.item_code_snapshot,
    itemName: row.item_name_snapshot,
    quantity: row.quantity,
    borrowDate: row.borrow_date,
    returnDate: row.return_date,
    status: row.status,
    notes: row.notes,
    returnNotes: row.return_notes,
    recordedById: row.recorded_by_id,
    recordedByName: row.recorded_by_name,
    returnedById: row.returned_by_id,
    returnedByName: row.returned_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row: DbActivityRow): ActivityLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actionType: row.action_type,
    targetLabel: row.target_label,
    summary: row.summary,
    scope: row.scope,
    createdAt: row.created_at,
  };
}

export class SupabaseRepository implements LabRepository {
  readonly backendName = "supabase" as const;
  private readonly client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  private async logActivity(entry: {
    actor: AppUser;
    actionType: string;
    targetLabel: string;
    summary: string;
    scope: "operational" | "admin_only";
  }): Promise<void> {
    await this.client.from("activity_logs").insert({
      actor_id: entry.actor.id,
      actor_name: entry.actor.fullName,
      actor_role: entry.actor.role,
      action_type: entry.actionType,
      target_label: entry.targetLabel,
      summary: entry.summary,
      scope: entry.scope,
    });
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.trim().toLowerCase();
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("username", normalized)
      .maybeSingle<DbUserRow>();

    if (error) {
      throw new RepoError(`Gagal mengakses basis data pengguna: ${error.message}`, 503);
    }
    return data ? mapUserWithHash(data) : null;
  }

  async findUserById(id: string): Promise<AppUser | null> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle<DbUserRow>();

    if (error) {
      throw new RepoError(`Gagal memuat sesi pengguna: ${error.message}`, 503);
    }
    return data ? mapUser(data) : null;
  }

  async listUsers(): Promise<AppUser[]> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<DbUserRow[]>();

    if (error) {
      throw new RepoError(`Gagal mengambil daftar pengguna: ${error.message}`, 503);
    }
    return (data ?? []).map(mapUser);
  }

  async createUser(input: UserCreateInput, actor: AppUser): Promise<AppUser> {
    const username = input.username.trim().toLowerCase();
    const fullName = input.fullName.trim();

    if (!username || username.length < 3) {
      throw new RepoError("Username minimal 3 karakter.", 400);
    }
    if (!/^[a-z0-9._-]+$/.test(username)) {
      throw new RepoError("Username hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung.", 400);
    }
    if (!fullName) {
      throw new RepoError("Nama lengkap wajib diisi.", 400);
    }
    if (!input.password || input.password.length < 6) {
      throw new RepoError("Password minimal 6 karakter.", 400);
    }

    const { data, error } = await this.client
      .from("users")
      .insert({
        username,
        full_name: fullName,
        password_hash: hashPassword(input.password),
        role: input.role ?? "staff",
        is_active: input.isActive ?? true,
      })
      .select("*")
      .single<DbUserRow>();

    if (error) {
      if (error.code === "23505") {
        throw new RepoError(`Username "${username}" sudah digunakan.`, 409);
      }
      throw new RepoError(`Gagal menambahkan pengguna: ${error.message}`, 400);
    }

    const created = mapUser(data);
    await this.logActivity({
      actor,
      actionType: "user_created",
      targetLabel: `${created.username} (${created.role.toUpperCase()})`,
      summary: `${actor.fullName} menambahkan akun ${created.role.toUpperCase()} untuk ${created.fullName} (${created.username}).`,
      scope: "admin_only",
    });
    return created;
  }

  async updateUser(id: string, input: UserUpdateInput, actor: AppUser): Promise<AppUser> {
    const { data: existing, error: fetchError } = await this.client
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle<DbUserRow>();

    if (fetchError) {
      throw new RepoError(`Gagal membaca data pengguna: ${fetchError.message}`, 503);
    }
    if (!existing) {
      throw new RepoError("Pengguna tidak ditemukan.", 404);
    }
    if (input.isActive === false && existing.id === actor.id) {
      throw new RepoError("Anda tidak dapat menonaktifkan akun Anda sendiri.", 400);
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.username !== undefined) {
      const nextUsername = input.username.trim().toLowerCase();
      if (!nextUsername || nextUsername.length < 3) {
        throw new RepoError("Username minimal 3 karakter.", 400);
      }
      if (!/^[a-z0-9._-]+$/.test(nextUsername)) {
        throw new RepoError("Username hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung.", 400);
      }
      patch.username = nextUsername;
    }

    if (input.fullName !== undefined) {
      const nextName = input.fullName.trim();
      if (!nextName) {
        throw new RepoError("Nama lengkap tidak boleh kosong.", 400);
      }
      patch.full_name = nextName;
    }

    if (input.password !== undefined && input.password.trim() !== "") {
      if (input.password.length < 6) {
        throw new RepoError("Password baru minimal 6 karakter.", 400);
      }
      patch.password_hash = hashPassword(input.password);
    }

    if (input.isActive !== undefined && input.isActive !== existing.is_active) {
      if (existing.role === "admin" && !input.isActive) {
        const { count } = await this.client
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("is_active", true)
          .neq("id", id);
        if ((count ?? 0) === 0) {
          throw new RepoError("Minimal satu akun Admin aktif harus tetap tersedia.", 400);
        }
      }
      patch.is_active = input.isActive;
    }

    const { data: updated, error: updateError } = await this.client
      .from("users")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single<DbUserRow>();

    if (updateError) {
      if (updateError.code === "23505") {
        throw new RepoError("Username tersebut sudah digunakan akun lain.", 409);
      }
      throw new RepoError(`Gagal memperbarui pengguna: ${updateError.message}`, 400);
    }

    const mapped = mapUser(updated);
    const toggled = input.isActive !== undefined && input.isActive !== existing.is_active;
    await this.logActivity({
      actor,
      actionType: toggled ? "user_toggled" : "user_updated",
      targetLabel: `${mapped.username} (${mapped.role.toUpperCase()})`,
      summary: toggled
        ? `${actor.fullName} ${mapped.isActive ? "mengaktifkan" : "menonaktifkan"} akun ${mapped.fullName} (${mapped.username}).`
        : `${actor.fullName} memperbarui data akun ${mapped.fullName} (${mapped.username}).`,
      scope: "admin_only",
    });
    return mapped;
  }

  async listItems(filters?: { query?: string; category?: string; availability?: string }): Promise<InventoryItem[]> {
    const { data, error } = await this.client
      .from("items")
      .select("*")
      .order("code", { ascending: true })
      .returns<DbItemRow[]>();

    if (error) {
      throw new RepoError(`Gagal mengambil daftar barang: ${error.message}`, 503);
    }

    const query = filters?.query?.trim().toLowerCase() ?? "";
    const category = filters?.category?.trim() ?? "";
    const availability = filters?.availability?.trim() ?? "";

    return (data ?? [])
      .map(mapItem)
      .filter((item) => {
        if (query) {
          const matches =
            item.code.toLowerCase().includes(query) ||
            item.name.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            item.location.toLowerCase().includes(query);
          if (!matches) return false;
        }
        if (category && category !== "all" && item.category !== category) {
          return false;
        }
        if (availability === "tersedia" && item.availableStock <= 0) {
          return false;
        }
        if (availability === "dipinjam" && item.availableStock === item.totalStock) {
          return false;
        }
        if (availability === "habis" && item.availableStock > 0) {
          return false;
        }
        return true;
      });
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    const { data, error } = await this.client
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle<DbItemRow>();

    if (error) {
      throw new RepoError(`Gagal membaca data barang: ${error.message}`, 503);
    }
    return data ? mapItem(data) : null;
  }

  async createItem(input: ItemInput, actor: AppUser): Promise<InventoryItem> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    const category = input.category.trim();
    const location = (input.location ?? "Lab Komputer Utama").trim() || "Lab Komputer Utama";
    const totalStock = Number(input.totalStock);

    if (!code) {
      throw new RepoError("Kode barang wajib diisi.", 400);
    }
    if (!name) {
      throw new RepoError("Nama barang wajib diisi.", 400);
    }
    if (!category) {
      throw new RepoError("Kategori barang wajib dipilih.", 400);
    }
    if (!Number.isInteger(totalStock) || totalStock < 0) {
      throw new RepoError("Stok barang harus berupa bilangan bulat non-negatif.", 400);
    }

    const { data, error } = await this.client
      .from("items")
      .insert({
        code,
        name,
        category,
        total_stock: totalStock,
        available_stock: totalStock,
        location,
      })
      .select("*")
      .single<DbItemRow>();

    if (error) {
      if (error.code === "23505") {
        throw new RepoError(`Kode barang "${code}" sudah terdaftar.`, 409);
      }
      throw new RepoError(`Gagal menambahkan barang: ${error.message}`, 400);
    }

    const created = mapItem(data);
    await this.logActivity({
      actor,
      actionType: "item_created",
      targetLabel: `${created.code} - ${created.name}`,
      summary: `${actor.fullName} menambahkan barang ${created.code} (${created.name}) sebanyak ${created.totalStock} unit.`,
      scope: "operational",
    });
    return created;
  }

  async updateItem(id: string, input: Partial<ItemInput>, actor: AppUser): Promise<InventoryItem> {
    const { data: existing, error: fetchError } = await this.client
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle<DbItemRow>();

    if (fetchError) {
      throw new RepoError(`Gagal membaca barang: ${fetchError.message}`, 503);
    }
    if (!existing) {
      throw new RepoError("Barang tidak ditemukan.", 404);
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.code !== undefined) {
      const nextCode = input.code.trim().toUpperCase();
      if (!nextCode) {
        throw new RepoError("Kode barang tidak boleh kosong.", 400);
      }
      patch.code = nextCode;
    }

    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new RepoError("Nama barang tidak boleh kosong.", 400);
      }
      patch.name = nextName;
    }

    if (input.category !== undefined) {
      const nextCategory = input.category.trim();
      if (!nextCategory) {
        throw new RepoError("Kategori barang wajib diisi.", 400);
      }
      patch.category = nextCategory;
    }

    if (input.location !== undefined) {
      patch.location = input.location.trim() || "Lab Komputer Utama";
    }

    if (input.totalStock !== undefined) {
      const nextTotal = Number(input.totalStock);
      if (!Number.isInteger(nextTotal) || nextTotal < 0) {
        throw new RepoError("Stok barang harus berupa bilangan bulat non-negatif.", 400);
      }
      const currentlyBorrowed = existing.total_stock - existing.available_stock;
      if (nextTotal < currentlyBorrowed) {
        throw new RepoError(
          `Stok total (${nextTotal}) tidak boleh lebih kecil dari unit yang sedang dipinjam (${currentlyBorrowed}).`,
          400,
        );
      }
      patch.total_stock = nextTotal;
      patch.available_stock = nextTotal - currentlyBorrowed;
    }

    const { data: updated, error: updateError } = await this.client
      .from("items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single<DbItemRow>();

    if (updateError) {
      if (updateError.code === "23505") {
        throw new RepoError("Kode barang tersebut sudah digunakan barang lain.", 409);
      }
      throw new RepoError(`Gagal memperbarui barang: ${updateError.message}`, 400);
    }

    const mapped = mapItem(updated);
    await this.logActivity({
      actor,
      actionType: "item_updated",
      targetLabel: `${mapped.code} - ${mapped.name}`,
      summary: `${actor.fullName} memperbarui data barang ${mapped.code} (${mapped.name}, stok total ${mapped.totalStock} unit).`,
      scope: "operational",
    });
    return mapped;
  }

  async deleteItem(id: string, actor: AppUser): Promise<void> {
    const { data: existing, error: fetchError } = await this.client
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle<DbItemRow>();

    if (fetchError) {
      throw new RepoError(`Gagal memeriksa barang: ${fetchError.message}`, 503);
    }
    if (!existing) {
      throw new RepoError("Barang tidak ditemukan.", 404);
    }

    const { count } = await this.client
      .from("borrowings")
      .select("id", { count: "exact", head: true })
      .eq("item_id", id)
      .eq("status", "dipinjam");

    if ((count ?? 0) > 0) {
      throw new RepoError(
        "Barang tidak dapat dihapus karena masih memiliki transaksi peminjaman aktif.",
        409,
      );
    }

    const { error: deleteError } = await this.client.from("items").delete().eq("id", id);
    if (deleteError) {
      throw new RepoError(`Gagal menghapus barang: ${deleteError.message}`, 400);
    }

    await this.logActivity({
      actor,
      actionType: "item_deleted",
      targetLabel: `${existing.code} - ${existing.name}`,
      summary: `${actor.fullName} menghapus barang ${existing.code} (${existing.name}) dari inventaris.`,
      scope: "operational",
    });
  }

  async listBorrowings(filters?: { status?: string; query?: string; onlyActorId?: string }): Promise<BorrowingRecord[]> {
    let builder = this.client
      .from("borrowings")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      builder = builder.eq("status", filters.status);
    }

    const { data, error } = await builder.returns<DbBorrowingRow[]>();
    if (error) {
      throw new RepoError(`Gagal mengambil transaksi peminjaman: ${error.message}`, 503);
    }

    const query = filters?.query?.trim().toLowerCase() ?? "";
    const onlyActorId = filters?.onlyActorId?.trim() ?? "";

    return (data ?? [])
      .map(mapBorrowing)
      .filter((b) => {
        if (onlyActorId && b.recordedById !== onlyActorId && b.returnedById !== onlyActorId) {
          return false;
        }
        if (query) {
          const matches =
            b.transactionCode.toLowerCase().includes(query) ||
            b.borrowerName.toLowerCase().includes(query) ||
            b.itemCode.toLowerCase().includes(query) ||
            b.itemName.toLowerCase().includes(query) ||
            b.recordedByName.toLowerCase().includes(query);
          if (!matches) return false;
        }
        return true;
      });
  }

  async createBorrowing(input: BorrowingCreateInput, actor: AppUser): Promise<BorrowingRecord> {
    if (!input.borrowerName.trim()) {
      throw new RepoError("Nama peminjam wajib diisi.", 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.borrowDate.trim())) {
      throw new RepoError("Tanggal peminjaman tidak valid.", 400);
    }
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new RepoError("Jumlah barang yang dipinjam minimal 1 unit.", 400);
    }

    const { data, error } = await this.client.rpc("create_borrowing_tx", {
      p_borrower_name: input.borrowerName.trim(),
      p_item_id: input.itemId,
      p_quantity: quantity,
      p_borrow_date: input.borrowDate.trim(),
      p_notes: (input.notes ?? "").trim(),
      p_actor_id: actor.id,
      p_actor_name: actor.fullName,
      p_actor_role: actor.role,
    });

    if (error) {
      throw new RepoError(error.message || "Gagal mencatat peminjaman.", 400);
    }

    return mapBorrowing(data as DbBorrowingRow);
  }

  async returnBorrowing(input: BorrowingReturnInput, actor: AppUser): Promise<BorrowingRecord> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.returnDate.trim())) {
      throw new RepoError("Tanggal pengembalian tidak valid.", 400);
    }

    const { data, error } = await this.client.rpc("return_borrowing_tx", {
      p_borrowing_id: input.borrowingId,
      p_return_date: input.returnDate.trim(),
      p_return_notes: (input.returnNotes ?? "").trim(),
      p_actor_id: actor.id,
      p_actor_name: actor.fullName,
      p_actor_role: actor.role,
    });

    if (error) {
      throw new RepoError(error.message || "Gagal memproses pengembalian.", 400);
    }

    return mapBorrowing(data as DbBorrowingRow);
  }

  async listActivityLogs(actor: AppUser, limit = 10): Promise<ActivityLog[]> {
    let builder = this.client
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (actor.role === "staff") {
      builder = builder.eq("scope", "operational");
    }

    const { data, error } = await builder.returns<DbActivityRow[]>();
    if (error) {
      throw new RepoError(`Gagal mengambil riwayat aktivitas: ${error.message}`, 503);
    }
    return (data ?? []).map(mapActivity);
  }

  async getDashboardSummary(actor: AppUser): Promise<DashboardSummary> {
    const [items, borrowings, recentActivities] = await Promise.all([
      this.listItems(),
      this.listBorrowings(),
      this.listActivityLogs(actor, 8),
    ]);

    const totalItemTypes = items.length;
    const totalUnits = items.reduce((sum, item) => sum + item.totalStock, 0);
    const availableUnits = items.reduce((sum, item) => sum + item.availableStock, 0);
    const borrowedUnits = totalUnits - availableUnits;

    const totalTransactions = borrowings.length;
    const activeBorrowingsAll = borrowings.filter((b) => b.status === "dipinjam");
    const activeTransactions = activeBorrowingsAll.length;
    const completedTransactions = totalTransactions - activeTransactions;

    const attentionItems = items
      .filter((item) => item.availableStock < item.totalStock || item.availableStock === 0)
      .sort((a, b) => a.availableStock - b.availableStock)
      .slice(0, 6);

    return {
      totalItemTypes,
      totalUnits,
      availableUnits,
      borrowedUnits,
      totalTransactions,
      activeTransactions,
      completedTransactions,
      recentActivities,
      activeBorrowings: activeBorrowingsAll.slice(0, 6),
      attentionItems,
      storageBackend: this.backendName,
    };
  }
}

