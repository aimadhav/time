export interface MeetingRecord {
  id: string;
  receiptId: string;
  seller: string;
  buyer: string;
  hours: number;
  description?: string;
  timestamp: string;
  role: 'seller' | 'buyer';
}

const STORAGE_KEY = 'hour-vault-meetings';
const REDEEMED_PREFIX = 'hour-vault-redeemed';

type MeetingStore = Record<string, MeetingRecord[]>;

const loadStore = (): MeetingStore => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as MeetingStore;
    }
  } catch (error) {
    console.warn('Failed to parse meeting records from storage', error);
  }
  return {};
};

const saveStore = (store: MeetingStore) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('Failed to persist meeting records', error);
  }
};

const generateMeetingId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('Failed to generate UUID, falling back to timestamp', error);
    }
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}`;
};

const upsertRecordForAddress = (
  address: string,
  role: 'seller' | 'buyer',
  record: Omit<MeetingRecord, 'id' | 'timestamp' | 'role'> & { timestamp: string }
): MeetingRecord => {
  const normalized = address.trim();
  const store = loadStore();
  const existing = store[normalized] ?? [];
  const nextRecord: MeetingRecord = {
    id: generateMeetingId(),
    ...record,
    seller: record.seller.trim(),
    buyer: record.buyer.trim(),
    role,
  };

  const deduped = existing.filter((item) => item.receiptId !== record.receiptId || item.role !== role);
  store[normalized] = [nextRecord, ...deduped];
  saveStore(store);
  return nextRecord;
};

export const recordMeeting = (
  record: Omit<MeetingRecord, 'id' | 'timestamp' | 'role'> & { timestamp?: string }
) => {
  const timestamp = record.timestamp ?? new Date().toISOString();
  const base = {
    receiptId: String(record.receiptId),
    seller: record.seller.trim(),
    buyer: record.buyer.trim(),
    hours: record.hours,
    description: record.description,
    timestamp,
  };

  const sellerRecord = upsertRecordForAddress(base.seller, 'seller', base);
  const buyerRecord = upsertRecordForAddress(base.buyer, 'buyer', base);

  return { seller: sellerRecord, buyer: buyerRecord };
};

export const getMeetingsForAddress = (address: string | null | undefined): MeetingRecord[] => {
  if (!address) {
    return [];
  }
  const normalized = address.trim();
  const store = loadStore();
  const records = store[normalized] ?? [];
  return [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const getRedeemedStorageKey = (buyer: string) => `${REDEEMED_PREFIX}:${buyer.trim()}`;

const loadRedeemedReceipts = (buyer: string): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(getRedeemedStorageKey(buyer));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((value) => String(value));
    }
  } catch (error) {
    console.warn('Failed to load redeemed receipt records', error);
  }
  return [];
};

const saveRedeemedReceipts = (buyer: string, receiptIds: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const unique = Array.from(new Set(receiptIds)).sort((a, b) => b.localeCompare(a));
    window.localStorage.setItem(getRedeemedStorageKey(buyer), JSON.stringify(unique));
  } catch (error) {
    console.warn('Failed to persist redeemed receipt records', error);
  }
};

export const markReceiptRedeemed = (buyer: string, receiptId: number | bigint | string) => {
  const normalized = String(receiptId);
  if (!normalized || normalized === 'NaN') {
    console.warn('Skipping redeemed receipt persistence due to invalid id', receiptId);
    return;
  }
  const existing = loadRedeemedReceipts(buyer);
  if (!existing.includes(normalized)) {
    existing.push(normalized);
    saveRedeemedReceipts(buyer, existing);
  }
};

export const getRedeemedReceipts = (buyer: string | null | undefined): string[] => {
  if (!buyer) {
    return [];
  }
  return loadRedeemedReceipts(buyer);
};

export const isReceiptRedeemed = (buyer: string | null | undefined, receiptId: number): boolean => {
  if (!buyer) {
    return false;
  }
  return loadRedeemedReceipts(buyer).includes(String(receiptId));
};
