import { ActivityLog, BorrowingRecord, InventoryItem, UserRecord } from "./types";

export const DEFAULT_CATEGORIES = [
  "Laptop",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Proyektor",
  "Perangkat Jaringan",
  "Aksesori Lab",
] as const;

export interface LocalStoreData {
  nextBorrowingNumber: number;
  users: UserRecord[];
  items: InventoryItem[];
  borrowings: BorrowingRecord[];
  activityLogs: ActivityLog[];
}

export function createInitialSeedData(): LocalStoreData {
  const now = new Date().toISOString();

  const users: UserRecord[] = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      username: "admin",
      fullName: "Kepala Lab Komputer",
      passwordHash:
        "scrypt$960dccfa64d059eefb67ee265a7aa171$8c0164b163ab2b1c3b37c0cf67e9e9194711adde21de7621ab896c80d6bc566460fd734ccda0fa9a66cb5f413568afc23b33d8e470f00248eb2e8b81f4b1fce8",
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      username: "staff",
      fullName: "Petugas Lab Operasional",
      passwordHash:
        "scrypt$201c1fbabacb6b7aae3065cc20016aa3$03174916e44a8c63d05d0a30e2d3703caa0ce5df2d19bc191820b680013430149f109c1904235bbdcb0fd5dc9e8cc99355e6c5fd9671177beed5edc188dceeab",
      role: "staff",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const rawItems: Array<[string, string, string, number, string]> = [
    ["BR001", "Laptop Lenovo", "Laptop", 5, "Rak Lab A1"],
    ["BR002", "Mouse Logitech", "Mouse", 10, "Laci Periferal B1"],
    ["BR003", "Keyboard Mechanical", "Keyboard", 8, "Laci Periferal B2"],
    ["BR004", "Proyektor Epson", "Proyektor", 3, "Lemari AV C1"],
    ["BR005", "Monitor LG", "Monitor", 6, "Rak Lab A2"],
    ["BR006", "Router MikroTik RB750Gr3", "Perangkat Jaringan", 4, "Rak Jaringan D1"],
    ["BR007", "Switch TP-Link 8-Port Gigabit", "Perangkat Jaringan", 6, "Rak Jaringan D1"],
    ["BR008", "Access Point Ubiquiti UniFi", "Perangkat Jaringan", 3, "Rak Jaringan D2"],
    ["BR009", "Kabel HDMI 5 Meter", "Aksesori Lab", 12, "Lemari AV C2"],
    ["BR010", "Tang Crimping & LAN Tester", "Perangkat Jaringan", 7, "Box Alat Jaringan D3"],
    ["BR011", "Laptop ASUS VivoBook Lab", "Laptop", 6, "Rak Lab A1"],
    ["BR012", "Monitor Dell 24 Inch", "Monitor", 4, "Rak Lab A2"],
  ];

  const items: InventoryItem[] = rawItems.map(([code, name, category, stock, location], index) => ({
    id: `00000000-0000-4000-9000-${String(index + 1).padStart(12, "0")}`,
    code,
    name,
    category,
    totalStock: stock,
    availableStock: stock,
    location,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    nextBorrowingNumber: 1,
    users,
    items,
    borrowings: [],
    activityLogs: [],
  };
}

