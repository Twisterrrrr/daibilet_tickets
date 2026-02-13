'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// ─── Types ──────────────────────────────────────────────

export interface CartItem {
  eventId: string;
  offerId: string;
  sessionId?: string;
  quantity: number;
  // UI snapshot (not source of truth — validated on checkout):
  eventTitle: string;
  eventSlug: string;
  imageUrl?: string;
  priceFrom: number; // kopecks
  purchaseType: string;
  source: string;
  deeplink?: string;
  badge?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addItem: (item: CartItem) => void;
  removeItem: (offerId: string) => void;
  updateQuantity: (offerId: string, quantity: number) => void;
  clearCart: () => void;
}

// ─── Context ────────────────────────────────────────────

const STORAGE_KEY = 'daibilet_cart';

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Ignore invalid JSON
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.offerId === item.offerId);
      if (existingIdx >= 0) {
        // Update quantity
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + item.quantity,
        };
        return updated;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((offerId: string) => {
    setItems((prev) => prev.filter((i) => i.offerId !== offerId));
  }, []);

  const updateQuantity = useCallback((offerId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.offerId !== offerId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.offerId === offerId ? { ...i, quantity } : i)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.priceFrom * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, itemCount, totalPrice, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within <CartProvider>');
  }
  return ctx;
}
