import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "../password";
import { createInitialSeedData, LocalStoreData } from "../seed-data";
import {
  ActivityLog,
  AppUser,
  BorrowingRecord,
  DashboardSummary,
  InventoryItem,
  UserRecord,
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

const DEFAULT_DATA_PATH = path.join(process.cwd(), ".local-data", "labtrack.json");

function stripPassword(user: UserRecord): AppUser {
  const { passwordHash: _ignored, ...safe } = user;
  return safe;
}

export class LocalDevRepository implements LabRepository {
  readonly backendName = "local_preview" as const;
  private writeQueue: Promise<unknown> = Promise.resolve();

  private getDataFilePath(): string {
    return process.env.LABTRACK_DATA_FILE || DEFAULT_DATA_PATH;
  }

  private readStore(): LocalStoreData {
    const filePath = this.getDataFilePath();
    if (!fs.existsSync(filePath)) {
      const initial = createInitialSeedData();
      this.writeStore(initial);
      return initial;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as LocalStoreData;
  }

  private writeStore(data: LocalStoreData): void {
    const filePath = this.getDataFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
  }

  // Serialize file mutations inside the Node process to prevent lost updates.
  private withLock<T>(task: () => T): Promise<T> {
    const run = this.writeQueue.then(() => task());
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.trim().toLowerCase();
    const store = this.readStore();
    return store.users.find((u) => u.username.toLowerCase() === normalized) ?? null;
  }

  async findUserById(id: string): Promise<AppUser | null> {
    const store = this.readStore();
    const found = store.users.find((u) => u.id === id);
    return found ? stripPassword(found) : null;
  }

  async listUsers(): Promise<AppUser[]> {
    const store = this.readStore();
    return [...store.users]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(stripPassword);
  }

  async createUser(input: UserCreateInput, actor: AppUser): Promise<AppUser> {
    return this.withLock(() => {
      const store = this.readStore();
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
      if (store.users.some((u) => u.username.toLowerCase() === username)) {
        throw new RepoError(`Username "${username}" sudah digunakan.`, 409);
      }

      const now = new Date().toISOString();
      const created: UserRecord = {
        id: crypto.randomUUID(),
        username,
        fullName,
        passwordHash: hashPassword(input.password),
        role: input.role ?? "staff",
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      store.users.push(created);

      store.activityLogs.unshift({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: "user_created",
        targetLabel: `${created.username} (${created.role.toUpperCase()})`,
        summary: `${actor.fullName} menambahkan akun ${created.role.toUpperCase()} untuk ${created.fullName} (${created.username}).`,
        scope: "admin_only",
        createdAt: now,
      });

      this.writeStore(store);
      return stripPassword(created);
    });
  }

  async updateUser(id: string, input: UserUpdateInput, actor: AppUser): Promise<AppUser> {
    return this.withLock(() => {
      const store = this.readStore();
      const target = store.users.find((u) => u.id === id);
      if (!target) {
        throw new RepoError("Pengguna tidak ditemukan.", 404);
      }

      if (input.isActive === false && target.id === actor.id) {
        throw new RepoError("Anda tidak dapat menonaktifkan akun Anda sendiri.", 400);
      }

      if (input.username !== undefined) {
        const nextUsername = input.username.trim().toLowerCase();
        if (!nextUsername || nextUsername.length < 3) {
          throw new RepoError("Username minimal 3 karakter.", 400);
        }
        if (!/^[a-z0-9._-]+$/.test(nextUsername)) {
          throw new RepoError("Username hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung.", 400);
        }
        if (store.users.some((u) => u.id !== id && u.username.toLowerCase() === nextUsername)) {
          throw new RepoError(`Username "${nextUsername}" sudah digunakan.`, 409);
        }
        target.username = nextUsername;
      }

      if (input.fullName !== undefined) {
        const nextName = input.fullName.trim();
        if (!nextName) {
          throw new RepoError("Nama lengkap tidak boleh kosong.", 400);
        }
        target.fullName = nextName;
      }

      if (input.password !== undefined && input.password.trim() !== "") {
        if (input.password.length < 6) {
          throw new RepoError("Password baru minimal 6 karakter.", 400);
        }
        target.passwordHash = hashPassword(input.password);
      }

      let actionType = "user_updated";
      let summary = `${actor.fullName} memperbarui data akun ${target.fullName} (${target.username}).`;

      if (input.isActive !== undefined && input.isActive !== target.isActive) {
        if (target.role === "admin" && !input.isActive) {
          const activeAdmins = store.users.filter((u) => u.role === "admin" && u.isActive && u.id !== id);
          if (activeAdmins.length === 0) {
            throw new RepoError("Minimal satu akun Admin aktif harus tetap tersedia.", 400);
          }
        }
        target.isActive = input.isActive;
        actionType = "user_toggled";
        summary = `${actor.fullName} ${target.isActive ? "mengaktifkan" : "menonaktifkan"} akun ${target.fullName} (${target.username}).`;
      }

      const now = new Date().toISOString();
      target.updatedAt = now;

      store.activityLogs.unshift({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType,
        targetLabel: `${target.username} (${target.role.toUpperCase()})`,
        summary,
        scope: "admin_only",
        createdAt: now,
      });

      this.writeStore(store);
      return stripPassword(target);
    });
  }

  async listItems(filters?: { query?: string; category?: string; availability?: string }): Promise<InventoryItem[]> {
    const store = this.readStore();
    const query = filters?.query?.trim().toLowerCase() ?? "";
    const category = filters?.category?.trim() ?? "";
    const availability = filters?.availability?.trim() ?? "";

    return store.items
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
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    const store = this.readStore();
    return store.items.find((i) => i.id === id) ?? null;
  }

  async createItem(input: ItemInput, actor: AppUser): Promise<InventoryItem> {
    return this.withLock(() => {
      const store = this.readStore();
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
      if (store.items.some((i) => i.code.toUpperCase() === code)) {
        throw new RepoError(`Kode barang "${code}" sudah terdaftar.`, 409);
      }

      const now = new Date().toISOString();
      const created: InventoryItem = {
        id: crypto.randomUUID(),
        code,
        name,
        category,
        totalStock,
        availableStock: totalStock,
        location,
        createdAt: now,
        updatedAt: now,
      };
      store.items.push(created);

      store.activityLogs.unshift({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: "item_created",
        targetLabel: `${created.code} - ${created.name}`,
        summary: `${actor.fullName} menambahkan barang ${created.code} (${created.name}) sebanyak ${created.totalStock} unit.`,
        scope: "operational",
        createdAt: now,
      });

      this.writeStore(store);
      return created;
    });
  }

  async updateItem(id: string, input: Partial<ItemInput>, actor: AppUser): Promise<InventoryItem> {
    return this.withLock(() => {
      const store = this.readStore();
      const item = store.items.find((i) => i.id === id);
      if (!item) {
        throw new RepoError("Barang tidak ditemukan.", 404);
      }

      if (input.code !== undefined) {
        const nextCode = input.code.trim().toUpperCase();
        if (!nextCode) {
          throw new RepoError("Kode barang tidak boleh kosong.", 400);
        }
        if (store.items.some((i) => i.id !== id && i.code.toUpperCase() === nextCode)) {
          throw new RepoError(`Kode barang "${nextCode}" sudah digunakan barang lain.`, 409);
        }
        item.code = nextCode;
      }

      if (input.name !== undefined) {
        const nextName = input.name.trim();
        if (!nextName) {
          throw new RepoError("Nama barang tidak boleh kosong.", 400);
        }
        item.name = nextName;
      }

      if (input.category !== undefined) {
        const nextCategory = input.category.trim();
        if (!nextCategory) {
          throw new RepoError("Kategori barang wajib diisi.", 400);
        }
        item.category = nextCategory;
      }

      if (input.location !== undefined) {
        item.location = input.location.trim() || "Lab Komputer Utama";
      }

      if (input.totalStock !== undefined) {
        const nextTotal = Number(input.totalStock);
        if (!Number.isInteger(nextTotal) || nextTotal < 0) {
          throw new RepoError("Stok barang harus berupa bilangan bulat non-negatif.", 400);
        }
        const currentlyBorrowed = item.totalStock - item.availableStock;
        if (nextTotal < currentlyBorrowed) {
          throw new RepoError(
            `Stok total (${nextTotal}) tidak boleh lebih kecil dari unit yang sedang dipinjam (${currentlyBorrowed}).`,
            400,
          );
        }
        item.totalStock = nextTotal;
        item.availableStock = nextTotal - currentlyBorrowed;
      }

      const now = new Date().toISOString();
      item.updatedAt = now;

      store.activityLogs.unshift({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: "item_updated",
        targetLabel: `${item.code} - ${item.name}`,
        summary: `${actor.fullName} memperbarui data barang ${item.code} (${item.name}, stok total ${item.totalStock} unit).`,
        scope: "operational",
        createdAt: now,
      });

      this.writeStore(store);
      return item;
    });
  }

  async deleteItem(id: string, actor: AppUser): Promise<void> {
    return this.withLock(() => {
      const store = this.readStore();
      const index = store.items.findIndex((i) => i.id === id);
      if (index === -1) {
        throw new RepoError("Barang tidak ditemukan.", 404);
      }
      const item = store.items[index];

      const hasActiveBorrowing = store.borrowings.some(
        (b) => b.itemId === id && b.status === "dipinjam",
      );
      if (hasActiveBorrowing) {
        throw new RepoError(
          "Barang tidak dapat dihapus karena masih memiliki transaksi peminjaman aktif.",
          409,
        );
      }

      store.items.splice(index, 1);

      // Keep historical records intact even after the catalog entry is removed.
      for (const b of store.borrowings) {
        if (b.itemId === id) {
          b.itemId = null;
        }
      }

      const now = new Date().toISOString();
      store.activityLogs.unshift({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: "item_deleted",
        targetLabel: `${item.code} - ${item.name}`,
        summary: `${actor.fullName} menghapus barang ${item.code} (${item.name}) dari inventaris.`,
        scope: "operational",
        createdAt: now,
      });

      this.writeStore(store);
    });
  }

  async listBorrowings(filters?: { status?: string; query?: string; onlyActorId?: string }): Promise<BorrowingRecord[]> {
    const store = this.readStore();
    const status = filters?.status?.trim() ?? "";
    const query = filters?.query?.trim().toLowerCase() ?? "";
    const onlyActorId = filters?.onlyActorId?.trim() ?? "";

    return store.borrowings
      .filter((b) => {
        if (status && status !== "all" && b.status !== status) {
          return false;
        }
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
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createBorrowing(input: BorrowingCreateInput, actor: AppUser): Promise<BorrowingRecord> {
    return this.withLock(() => {
      const store = this.readStore();
      const borrowerName = input.borrowerName.trim();
      const quantity = Number(input.quantity);
      const borrowDate = input.borrowDate.trim();
      const notes = (input.notes ?? "").trim();

      if (!borrowerName) {
        throw new RepoError("Nama peminjam wajib diisi.", 400);
      }
      if (!borrowDate || !/^\d{4}-\d{2}-\d{2}$/.test(borrowDate)) {
        throw new RepoError("Tanggal peminjaman tidak valid.", 400);
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new RepoError("Jumlah barang yang dipinjam minimal 1 unit.", 400);
      }

      const item = store.items.find((i) => i.id === input.itemId);
      if (!item) {
        throw new RepoError("Barang yang dipilih tidak ditemukan.", 404);
      }
      if (item.availableStock < quantity) {
        throw new RepoError(`Stok tersedia hanya ${item.availableStock} unit.`, 400);
      }

      item.availableStock -= quantity;
      const now = new Date().toISOString();
      item.updatedAt = now;

      const transactionCode = `PJM-${String(store.nextBorrowingNumber).padStart(4, "0")}`;
      store.nextBorrowingNumber += 1;

      const borrowing: BorrowingRecord = {
        id: crypto.randomUUID(),
        transactionCode,
        borrowerName,
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        quantity,
        borrowDate,
        returnDate: null,
        status: "dipinjam",
        notes,
        returnNotes: "",
        recordedById: actor.id,
        recordedByName: actor.fullName,
        returnedById: null,
        returnedByName: null,
        createdAt: now,
        updatedAt: now,
      };
      store.borrowings.unshift(borrowing);

      store.activityLogs.unshift({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: "borrow_created",
        targetLabel: `${item.code} - ${item.name}`,
        summary: `${actor.fullName} mencatat peminjaman ${quantity} unit ${item.name} oleh ${borrowerName}.`,
        scope: "operational",
        createdAt: now,
      });

      this.writeStore(store);
      return borrowing;
    });
  }

  async returnBorrowing(input: BorrowingReturnInput, actor: AppUser): Promise<BorrowingRecord> {
    return this.withLock(() => {
      const store = this.readStore();
      const borrowing = store.borrowings.find((b) => b.id === input.borrowingId);
      if (!borrowing) {
        throw new RepoError("Transaksi peminjaman tidak ditemukan.", 404);
      }
      if (borrowing.status === "selesai") {
        throw new RepoError("Transaksi ini sudah dikembalikan sebelumnya.", 409);
      }

      const returnDate = input.returnDate.trim();
      if (!returnDate || !/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
        throw new RepoError("Tanggal pengembalian tidak valid.", 400);
      }

      const item = borrowing.itemId ? store.items.find((i) => i.id === borrowing.itemId) : null;
      const now = new Date().toISOString();
      if (item) {
        item.availableStock = Math.min(item.totalStock, item.availableStock + borrowing.quantity);
        item.updatedAt = now;
      }

      borrowing.status = "selesai";
      borrowing.returnDate = returnDate;
      borrowing.returnNotes = (input.returnNotes ?? "").trim();
      borrowing.returnedById = actor.id;
      borrowing.returnedByName = actor.fullName;
      borrowing.updatedAt = now;

      store.activityLogs.unshift({
        id: crypto.randomUUID(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: "borrow_returned",
        targetLabel: `${borrowing.itemCode} - ${borrowing.itemName}`,
        summary: `${actor.fullName} memproses pengembalian ${borrowing.quantity} unit ${borrowing.itemName} dari ${borrowing.borrowerName}.`,
        scope: "operational",
        createdAt: now,
      });

      this.writeStore(store);
      return borrowing;
    });
  }

  async listActivityLogs(actor: AppUser, limit = 10): Promise<ActivityLog[]> {
    const store = this.readStore();
    return store.activityLogs
      .filter((log) => (actor.role === "admin" ? true : log.scope === "operational"))
      .slice(0, limit);
  }

  async getDashboardSummary(actor: AppUser): Promise<DashboardSummary> {
    const store = this.readStore();
    const totalItemTypes = store.items.length;
    const totalUnits = store.items.reduce((sum, item) => sum + item.totalStock, 0);
    const availableUnits = store.items.reduce((sum, item) => sum + item.availableStock, 0);
    const borrowedUnits = totalUnits - availableUnits;

    const totalTransactions = store.borrowings.length;
    const activeBorrowingsAll = store.borrowings
      .filter((b) => b.status === "dipinjam")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const activeTransactions = activeBorrowingsAll.length;
    const completedTransactions = totalTransactions - activeTransactions;

    const recentActivities = await this.listActivityLogs(actor, 8);
    const attentionItems = store.items
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

