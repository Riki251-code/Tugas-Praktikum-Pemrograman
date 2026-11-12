import {
  ActivityLog,
  AppUser,
  BorrowingRecord,
  DashboardSummary,
  InventoryItem,
  UserRecord,
  UserRole,
} from "../types";

export interface ItemInput {
  code: string;
  name: string;
  category: string;
  totalStock: number;
  location?: string;
}

export interface BorrowingCreateInput {
  borrowerName: string;
  itemId: string;
  quantity: number;
  borrowDate: string;
  notes?: string;
}

export interface BorrowingReturnInput {
  borrowingId: string;
  returnDate: string;
  returnNotes?: string;
}

export interface UserCreateInput {
  username: string;
  fullName: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserUpdateInput {
  username?: string;
  fullName?: string;
  password?: string;
  isActive?: boolean;
}

export interface LabRepository {
  readonly backendName: "supabase" | "local_preview";
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<AppUser | null>;
  listUsers(): Promise<AppUser[]>;
  createUser(input: UserCreateInput, actor: AppUser): Promise<AppUser>;
  updateUser(id: string, input: UserUpdateInput, actor: AppUser): Promise<AppUser>;

  listItems(filters?: { query?: string; category?: string; availability?: string }): Promise<InventoryItem[]>;
  getItemById(id: string): Promise<InventoryItem | null>;
  createItem(input: ItemInput, actor: AppUser): Promise<InventoryItem>;
  updateItem(id: string, input: Partial<ItemInput>, actor: AppUser): Promise<InventoryItem>;
  deleteItem(id: string, actor: AppUser): Promise<void>;

  listBorrowings(filters?: { status?: string; query?: string; onlyActorId?: string }): Promise<BorrowingRecord[]>;
  createBorrowing(input: BorrowingCreateInput, actor: AppUser): Promise<BorrowingRecord>;
  returnBorrowing(input: BorrowingReturnInput, actor: AppUser): Promise<BorrowingRecord>;

  listActivityLogs(actor: AppUser, limit?: number): Promise<ActivityLog[]>;
  getDashboardSummary(actor: AppUser): Promise<DashboardSummary>;
}

