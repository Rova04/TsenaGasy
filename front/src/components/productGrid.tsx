// front/src/components/productGrid.tsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ProductCard } from "./ProductCard";
import type { ProductCardData } from "./ProductCard"; 
import { ProductDetailModal } from "./productDetailModal";
import type { ProductDetailData } from "./productDetailModal";
import { API_BASE_URL } from "../config/api";

interface ProductGridProps {
  onAddToCart?: (productId: string, qty?: number) => void | Promise<void>;
  userId?: string;
  filterMode?: FilterMode;
  category?: string | null;
  searchQuery?: string;
}

type FilterMode = "all" | "services";

export function ProductGrid({ onAddToCart, userId, filterMode = "all",  category = null, searchQuery = "" }: ProductGridProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetailData | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get<ProductCardData[]>(
          `${API_BASE_URL}/api/getAllproduct`
        );
        setProducts(res.data);
      } catch (e: any) {
        console.error(e);
        setError(e.response?.data?.error || e.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    if (!userId) return; // si public => rien

    const loadFavs = async () => {
      try {
        const res = await axios.get<any[]>(
          `${API_BASE_URL}/api/getFavByUser/${userId}`
        );

        const map: Record<string, boolean> = {};
        res.data.forEach((p) => (map[p.id] = true));
        setFavorites(map);
      } catch (e) {
        console.error("Erreur loadFavs", e);
      }
    };

    loadFavs();
  }, [userId]);
  
  const openModal = async (id: string) => {
    // 1) ouvrir tout de suite
    setIsModalOpen(true);
    setModalLoading(true);
    setModalError(null);

    const preview = products.find(p => p.id === id);
    if (preview) {
      setSelectedProduct({
        id: preview.id,
        nom: preview.nom,
        prix: preview.prix,
        stock: preview.stock,
        images: preview.images,
        tags: preview.tags,
        descriptions: "",     // sera rempli après fetch
        poids: 0,
        dimensions: "",
        materiaux: "",
        isLocation: preview.isLocation,
        categorie: preview.categorie,
        magasin: preview.magasin,
        produitLocation: null,
        Sponsor: preview.Sponsor ?? null
      } as ProductDetailData);
    } else {
      setSelectedProduct(null);
    }

    // 3) fetch réel
    try {
      const res = await axios.get<any>(`${API_BASE_URL}/api/getDetails/${id}`);
      const data = res.data.product ?? res.data;
      setSelectedProduct(data);
    } catch (e: any) {
      console.error("Erreur chargement détails produit", e);
      setModalError("Impossible de charger les détails.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setModalLoading(false);
    setModalError(null);
  };

  const toggleFavorite = async (produitId: string) => {
    if (!userId) return; // public => pas de back

    const isFav = !!favorites[produitId];

    // UI instantanée
    setFavorites((prev) => ({ ...prev, [produitId]: !isFav }));

    try {
      if (!isFav) {
        await axios.post(`${API_BASE_URL}/api/addFavori/${userId}`, { produitId });
      } else {
        await axios.delete(`${API_BASE_URL}/api/removeFav/${userId}/${produitId}`);
      }
    } catch (e) {
      console.error("Erreur toggleFavorite", e);
      // rollback si erreur
      setFavorites((prev) => ({ ...prev, [produitId]: isFav }));
    }
  };

  const visibleProducts = useMemo(() => {
    let list = products;

    // 🔹 filtrage "services"
    if (filterMode === "services") {
      list = list.filter((p) => p.isLocation);
    }

    // 🔹 filtrage catégories
    if (category && category !== "all") {
      const normalizedCategory = category.trim().toLowerCase();

      list = list.filter((p) => {
        if (!p.categorie) return false;

        let catLabel = "";

        if (typeof p.categorie === "string") {
          catLabel = p.categorie;
        } else if ("nomCat" in p.categorie) {
          // @ts-ignore
          catLabel = p.categorie.nomCat;
        } else if ("nom" in p.categorie) {
          // @ts-ignore
          catLabel = p.categorie.nom;
        }

        const normalizedLabel = (catLabel || "").trim().toLowerCase();
        return normalizedLabel.includes(normalizedCategory);
      });
    }

    // 🔹 filtrage texte (recherche)
    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.trim().toLowerCase();

      list = list.filter((p) => {
        const name = (p.nom || "").toLowerCase();
        const tags = Array.isArray(p.tags)
          ? p.tags.join(" ").toLowerCase()
          : "";
        const magasinName =
          (p.magasin && (p.magasin as any).nom_Magasin
            ? (p.magasin as any).nom_Magasin
            : ""
          ).toLowerCase();

        let catLabel = "";
        if (typeof p.categorie === "string") {
          catLabel = p.categorie;
        } else if (p.categorie && "nomCat" in p.categorie) {
          // @ts-ignore
          catLabel = p.categorie.nomCat;
        } else if (p.categorie && "nom" in p.categorie) {
          // @ts-ignore
          catLabel = p.categorie.nom;
        }
        const cat = (catLabel || "").toLowerCase();

        return (
          name.includes(q) ||
          tags.includes(q) ||
          magasinName.includes(q) ||
          cat.includes(q)
        );
      });
    }

    return list;
  }, [products, filterMode, category, searchQuery]);

  if (loading) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4 text-center">
          <p>Chargement des produits...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-500">❌ {error}</p>
        </div>
      </section>
    );
  }

  const hasActiveFilter = !!searchQuery || (category && category !== "all") || filterMode === "services";

  return (
    <>
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {filterMode === "services" ? "Services en location" : "Tous les produits"}
            </h2>
            <p className="text-gray-600">
              Découvrez les produits disponibles sur Tsena.mg
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleProducts.length === 0 ? (
              <div className="col-span-2 sm:col-span-3 lg:col-span-4 text-center text-gray-500 py-8">
                {hasActiveFilter
                  ? "Aucun produit ne correspond à vos critères."
                  : "Aucun produit disponible pour le moment."}
              </div>
            ) : (
              visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onProductClick={openModal}
                  onAddToCart={(id, qty) => onAddToCart?.(id, qty ?? 1)}
                  isFavorite={!!favorites[product.id]}
                  onToggleFavorite={userId ? toggleFavorite : undefined}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ✅ AJOUT: modal */}
      {isModalOpen && (
        <ProductDetailModal
          product={selectedProduct}
          loading={modalLoading}
          error={modalError}
          onClose={closeModal}
          onAddToCart={(id, qty) => onAddToCart?.(id, qty)}
          isFavorite={selectedProduct ? !!favorites[selectedProduct.id] : false}
          onToggleFavorite={userId ? toggleFavorite : undefined}
        />
      )}
    </>
  );
}
