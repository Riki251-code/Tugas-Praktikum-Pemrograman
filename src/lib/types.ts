export type UserRole = "admin" | "staff";

export type BadgeTone = "ok" | "warn" | "err" | "neutral";

export type BorrowingStatus = "dipinjam" | "selesai";

export type ActivityScope = "operational" | "admin_only";

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord extends AppUser {
  passwordHash: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  totalStock: number;
  availableStock: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowingRecord {
  id: string;
  transactionCode: string;
  borrowerName: string;
  itemId: string | null;
  itemCode: string;
  itemName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string | null;
  status: BorrowingStatus;
  notes: string;
  returnNotes: string;
  recordedById: string | null;
  recordedByName: string;
  returnedById: string | null;
  returnedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: UserRole;
  actionType: string;
  targetLabel: string;
  summary: string;
  scope: ActivityScope;
  createdAt: string;
}

export interface DashboardSummary {
  totalItemTypes: number;
  totalUnits: number;
  availableUnits: number;
  borrowedUnits: number;
  totalTransactions: number;
  activeTransactions: number;
  completedTransactions: number;
  recentActivities: ActivityLog[];
  activeBorrowings: BorrowingRecord[];
  attentionItems: InventoryItem[];
  storageBackend: "supabase" | "local_preview";
}
