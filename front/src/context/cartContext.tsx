// front/src/context/cartContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import {
  addToCartApi,
  getCartApi,
  removeLineApi,
  updateLineQtyApi,
  type Cart,
} from "../services/cartServices";
import { toast } from "sonner";

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  error: string | null;

  // helpers dérivés
  itemCount: number;      // total quantités
  totalAmount: number;    // total prix

  refreshCart: () => Promise<void>;
  addToCart: (produitId: string, qty?: number) => Promise<void>;
  updateQty: (produitId: string, qty: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  clearError: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timersRef = useRef<Map<string, any>>(new Map());

  const clearError = () => setError(null);

  const refreshCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const fresh = await getCartApi(userId);
      setCart(fresh);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Erreur panier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const addToCart = async (produitId: string, qty = 1) => {
    try {
        setError(null);

        // optimistic UI
        setCart((prev) => {
        if (!prev) return prev;
        const lines = [...prev.lignes];
        const idx = lines.findIndex((l) => l.idProduit === produitId);
        if (idx >= 0) {
            const l = lines[idx];
            const newQty = l.quantite + qty;
            lines[idx] = {
            ...l,
            quantite: newQty,
            total: l.prix_Unitaire * newQty,
            };
        } else {
            // si ligne pas encore en local, tu peux l’ajouter en "placeholder"
            lines.push({
            id: "tmp-" + produitId,
            idProduit: produitId,
            quantite: qty,
            prix_Unitaire: 0,
            total: 0,
            produit: null,
            } as any);
        }
        return { ...prev, lignes: lines };
        });

        // write
        await addToCartApi(userId, produitId, qty);

        // refresh réel depuis back
        await refreshCart();

        toast.success(qty === 1 ? "Produit ajouté au panier" : `Produit ajouté x${qty}`);
    } catch (e: any) {
        setError(e.response?.data?.error || e.message || "Erreur ajout panier");
        await refreshCart(); // rollback
    }
    };

  const updateQty = async (produitId: string, qty: number) => {
    const safeQty = Math.max(1, qty); // min = 1

    setCart((prev) => {
      if (!prev) return prev;

      const lignes = prev.lignes.map((l) => {
        if (l.idProduit !== produitId) return l;

        return {
          ...l,
          quantite: safeQty,
          total: Number(l.prix_Unitaire) * safeQty,
        };
      });

      return { ...prev, lignes };
    });

    const prevTimer = timersRef.current.get(produitId);
    if (prevTimer) clearTimeout(prevTimer);

    const timer = setTimeout(async () => {
      try {
        setError(null);

        // on envoie seulement la dernière qty
        const updated = await updateLineQtyApi(userId, produitId, safeQty);

        setCart(updated);
      } catch (e: any) {
        setError(
          e.response?.data?.error ||
          e.message ||
          "Erreur update quantité"
        );
        await refreshCart(); // rollback si back refuse
      } finally {
        timersRef.current.delete(produitId);
      }
    }, 2000); // ✅ 2 secondes

    timersRef.current.set(produitId, timer);
  };

  const removeFromCart = async (lineId: string) => {
    try {
      setError(null);

      // UI optimiste : on retire direct la ligne
      setCart(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lignes: prev.lignes.filter(l => l.id !== lineId),
        };
      });

      await removeLineApi(userId, lineId);

      toast.success("Produit retiré du panier");
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Erreur suppression panier");
      await refreshCart(); // rollback
    }
  };

  const itemCount = useMemo(() => {
    return cart?.lignes?.reduce((sum, l) => sum + l.quantite, 0) ?? 0;
  }, [cart]);

  const totalAmount = useMemo(() => {
    return cart?.lignes?.reduce((sum, l) => sum + Number(l.total), 0) ?? 0;
  }, [cart]);

  const value: CartContextValue = {
    cart,
    loading,
    error,
    itemCount,
    totalAmount,
    refreshCart,
    addToCart,
    updateQty,
    removeFromCart,
    clearError,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans CartProvider");
  return ctx;
}
