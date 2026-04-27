import React, { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import Swal from "sweetalert2";

export type ProductDetailData = {
  id: string;
  nom: string;
  prix: number | string;
  stock: number;
  images: string[];
  tags: string[];
  descriptions: string;
  poids: number;
  dimensions: string;
  materiaux: string;
  isLocation: boolean;
  categorie?: { nomCat: string };
  magasin?: { nom_Magasin: string; type?: string };
  produitLocation?: {
    caution: number | string;
    duree_min: number;
    disponible: boolean;
    typePrix: string;
    lieuRecup: string;
  } | null;

  // back renvoie Sponsor
  Sponsor?: any | null;

  // optionnel (si un jour tu le mets directement dans le front/back)
  isSponsored?: boolean;
};

type Props = {
  product: ProductDetailData | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onAddToCart: (productId: string, qty: number) => Promise<void> | void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export const ProductDetailModal: React.FC<Props> = ({
  product,
  loading = false,
  error,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
}) => {
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setQty(1);
    setActiveImg(0);
  }, [product?.id]);

  const hasImages = (product?.images?.length ?? 0) > 0;
  const isOut = (product?.stock ?? 0) <= 0;

  const displayedImage = useMemo(() => {
    if (!product || !hasImages) return null;
    const idx = Math.min(activeImg, product.images.length - 1);
    return product.images[idx];
  }, [activeImg, hasImages, product]);

  const showSkeleton = loading && !product;

  const getTypePrixSuffix = () => {
    if (!product?.isLocation) return "";
    const tp = product.produitLocation?.typePrix?.toLowerCase().trim();
    if (!tp) return "";
    if (tp === "journalier") return "/jour";
    if (tp === "hebdomadaire") return "/semaine";
    if (tp === "mensuel") return "/mois";
    return `/${product.produitLocation?.typePrix}`;
  };

  if (!product && !showSkeleton) return null;

  // ✅ détecte sponsorisé depuis back OU front
  const isSponsored = !!product?.isSponsored || !!product?.Sponsor;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
        style={{
          width: "92vw",
          maxWidth: 980,
          maxHeight: "88vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative px-6 py-4 border-b border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#2D8A47]">
              {product?.nom ?? (showSkeleton ? "Chargement..." : "Détails produit")}
            </h2>
            {product && (
              <p className="text-sm text-gray-600 mt-1">
                {product.magasin?.nom_Magasin ?? "Vendeur"}
              </p>
            )}

            {/* ❌ badge sponsor supprimé du header */}
          </div>
        </div>

        {!!error && (
          <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </div>
        )}

        {/* BODY */}
        <div
          className="w-full"
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1.1fr",
            gap: 0,
            maxHeight: "calc(88vh - 80px)",
            overflowY: "auto",
          }}
        >
          {/* IMAGES */}
          <div className="p-6 bg-gray-50 border-r border-gray-200">
            <div
              className="bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-200"
              style={{ height: 440 }}
            >
              {showSkeleton && <div className="w-full h-full animate-pulse bg-gray-200" />}
              {!showSkeleton && displayedImage && product && (
                <img
                  src={displayedImage}
                  alt={product.nom}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  loading="eager"
                />
              )}
              {!showSkeleton && !displayedImage && (
                <div className="text-gray-400 text-sm">Aucune image</div>
              )}
            </div>

            {!showSkeleton && product && hasImages && product.images.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={img + i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square w-20 rounded-lg overflow-hidden border-2 bg-white transition-all
                      ${i === activeImg ? "border-[#2D8A47] shadow-md" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div
            className="p-6"
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100%",
            }}
          >
            {showSkeleton ? (
              <div className="space-y-3">
                <div className="h-8 w-44 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                <div className="h-20 w-full bg-gray-200 animate-pulse rounded-md" />
                <div className="h-12 w-full bg-gray-200 animate-pulse rounded-md" />
              </div>
            ) : product ? (
              <>
                {/* HAUT */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    {/* ✅ Status + Sponsor ensemble à gauche */}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={product.isLocation ? "location" : "vente"} />

                      {isSponsored && (
                        <div
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            background: "#F97316",
                            color: "#FFFF",
                            border: "1px solid #FED7AA",
                            lineHeight: 1.2,
                          }}
                        >
                          Sponsorisé
                        </div>
                      )}
                    </div>

                    {onToggleFavorite && (
                      <button
                        onClick={() => onToggleFavorite(product.id)}
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        aria-label="Favori"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill={isFavorite ? "#e11d48" : "none"}
                          stroke={isFavorite ? "#e11d48" : "#6b7280"}
                          strokeWidth="2"
                        >
                          <path d="M20.8 4.6c-1.9-1.8-5-1.7-6.8.3L12 6.9l-2-2C8.2 2.9 5.1 2.8 3.2 4.6c-2.1 2-2.1 5.3 0 7.3l8.8 8.5 8.8-8.5c2.1-2 2.1-5.3 0-7.3z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {product.categorie?.nomCat && (
                    <div className="text-xs text-gray-600 mb-4">
                      Catégorie :{" "}
                      <span className="font-semibold text-gray-900">
                        {product.categorie.nomCat}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-base text-gray-800 leading-relaxed whitespace-pre-line">
                      {product.descriptions || "Pas de description disponible."}
                    </p>
                  </div>

                  {product.tags?.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {product.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-extrabold text-gray-900">
                        {Number(product.prix).toLocaleString()} Ar
                      </div>
                      {!!getTypePrixSuffix() && (
                        <div className="text-sm font-bold text-gray-600 pb-1">
                          {getTypePrixSuffix()}
                        </div>
                      )}
                    </div>

                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                        ${isOut ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            isOut ? "bg-red-500" : "bg-green-500"
                          }`}
                        />
                        {isOut ? "Indisponible" : "Disponible"}
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg space-y-2 text-sm">
                    <div className="font-semibold text-green-800 mb-2">
                      {product.isLocation ? "Informations de location" : "Caractéristiques"}
                    </div>

                    {product.isLocation && product.produitLocation ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Caution :</span>
                          <span className="font-medium text-gray-900">
                            {Number(product.produitLocation.caution).toLocaleString()} Ar
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Durée minimum :</span>
                          <span className="font-medium text-gray-900">
                            {product.produitLocation.duree_min} jours
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Récupération :</span>
                          <span className="font-medium text-gray-900">
                            {product.produitLocation.lieuRecup}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {product.poids > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Poids :</span>
                            <span className="font-medium text-gray-900">
                              {product.poids} g
                            </span>
                          </div>
                        )}
                        {product.dimensions && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dimensions :</span>
                            <span className="font-medium text-gray-900">
                              {product.dimensions}
                            </span>
                          </div>
                        )}
                        {product.materiaux && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Matériaux :</span>
                            <span className="font-medium text-gray-900">
                              {product.materiaux}
                            </span>
                          </div>
                        )}
                        {!product.poids && !product.dimensions && !product.materiaux && (
                          <div className="text-gray-600">Aucune caractéristique disponible.</div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* BAS */}
                <div style={{ marginTop: "auto" }}>
                  <div className="pt-4 border-t border-gray-200">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Quantité
                    </label>

                    <div className="flex items-center gap-3 mb-3">
                      <button
                        disabled={qty <= 1}
                        className="w-9 h-9 rounded-md border border-gray-300 text-lg hover:bg-gray-50 transition font-medium"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                      >
                        −
                      </button>
                      <div className="w-10 text-center font-semibold text-lg">{qty}</div>
                        <button
                          disabled={qty >= product.stock}
                        className="w-9 h-9 rounded-md border border-gray-300 text-lg hover:bg-gray-50 transition font-medium"
                        onClick={() => setQty((q) => Math.min(q + 1, product.stock))}
                      >
                        +
                      </button>
                    </div>

                    <button
                      disabled={isOut}
                      onClick={async () => {
                        if (!product || adding) return;

                        const safeQty = Math.max(1, Math.min(qty, product.stock));
                        if (safeQty !== qty) setQty(safeQty);

                        setAdding(true);

                        // ✅ SweetAlert qui fige l’UI pendant l’ajout
                        Swal.fire({
                          title: "Ajout au panier...",
                          text: "Merci de patienter",
                          allowOutsideClick: false,
                          allowEscapeKey: false,
                          showConfirmButton: false,
                          didOpen: () => {
                            Swal.showLoading();
                          },
                        });

                        try {
                          await onAddToCart(product.id, safeQty);

                          // ✅ feedback succès
                          await Swal.fire({
                            icon: "success",
                            title: "Ajouté !",
                            timer: 900,
                            showConfirmButton: false,
                          });

                          onClose(); // ✅ tu fermes seulement après succès
                        } catch (err: any) {
                          Swal.fire({
                            icon: "error",
                            title: "Erreur",
                            text:
                              err?.response?.data?.error ||
                              err?.message ||
                              "Impossible d'ajouter au panier",
                          });
                        } finally {
                          setAdding(false);
                        }
                      }}
                      className="
                        w-full bg-[#2D8A47] text-white py-2 rounded-md font-semibold
                        disabled:bg-gray-300 disabled:cursor-not-allowed
                        hover:bg-[#245A35] transition text-sm
                      "
                    >
                      {isOut ? "Rupture de stock" : "Ajouter au panier"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
