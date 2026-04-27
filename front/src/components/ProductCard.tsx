// front/src/components/ProductCard.tsx
import React, { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import Swal from "sweetalert2";

export type ProductCardData = {
  id: string;
  nom: string;
  prix: number | string;
  stock: number;
  images: string[];
  tags: string[];
  isLocation: boolean;
  categorie: { nomCat: string };
  magasin: { nom_Magasin: string };
  typePrix?: string | null;
  Sponsor?: { statut: string } | null;
};

type Props = {
  product: ProductCardData;
  onProductClick: (id: string) => void;
  onAddToCart?: (id: string, qty?: number) => void | Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
};

export const ProductCard: React.FC<Props> = ({ product, onProductClick, onAddToCart, isFavorite, onToggleFavorite, }) => {
  const hasImage = product.images?.length > 0;
  const sponsorOk = product.Sponsor?.statut === "validé";
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.stock <= 0;
  
  const getTypePrixSuffix = () => {
    if (!product.isLocation) return "";
    const tp = product.typePrix?.toLowerCase().trim();
    if (!tp) return "";
    if (tp === "journalier") return "/jour";
    if (tp === "hebdomadaire") return "/semaine";
    if (tp === "mensuel") return "/mois";
    return `/${product.typePrix}`;
  };

  return (
    <div
      onClick={() => onProductClick(product.id)}
      className="group cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition"
      style={{
        backgroundColor: "#2D8A47",
        borderRadius: "0.35rem",
        border: "1px solid transparent",
        outline: "none",
        boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
      }}
    >
      {/* IMAGE */}
      <div className="relative aspect-square bg-gray-100">
        {hasImage && (
          <img
            src={product.images[0]}
            alt={product.nom}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition"
            loading="lazy"
          />
        )}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product.id);
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill={isFavorite ? "#e11d48" : "none"}
              stroke={isFavorite ? "#e11d48" : "#2D8A47"}
              strokeWidth="2"
            >
              <path d="M20.8 4.6c-1.9-1.8-5-1.7-6.8.3L12 6.9l-2-2C8.2 2.9 5.1 2.8 3.2 4.6c-2.1 2-2.1 5.3 0 7.3l8.8 8.5 8.8-8.5c2.1-2 2.1-5.3 0-7.3z" />
            </svg>
          </button>
        )}

        {/* BADGES */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          <div className="scale-125 origin-top-left drop-shadow-sm">
            <StatusBadge status={product.isLocation ? "location" : "vente"} />
          </div>

          {sponsorOk && (
            <span
              className="inline-block px-3 py-1.5 text-sm font-semibold rounded-full
                         bg-yellow-500 text-white shadow-md"
            >
              Sponsorisé
            </span>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="text-white" style={{ padding: "10px" }}>
        {/* Magasin */}
        <div
          className="line-clamp-1"
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {product.magasin.nom_Magasin}
        </div>

        {/* Catégorie */}
        <div
          className="italic line-clamp-1"
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.78)",
            marginTop: "1px",
          }}
        >
          {product.categorie.nomCat}
        </div>

        {/* Nom produit */}
        <h3
          className="line-clamp-2 text-white"
          style={{
            marginTop: "4px",
            fontSize: "18px",
            fontWeight: 800,
            lineHeight: 1.25,
          }}
        >
          {product.nom}
        </h3>

        {/* Prix */}
        <div style={{ marginTop: "6px" }}>
          <div
            style={{
              fontSize: "21px",
              fontWeight: 900,
              color: "#FBBF24",
              letterSpacing: "0.2px",
            }}
          >
            {Number(product.prix).toLocaleString()} Ar
            {product.isLocation && (
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "#FBBF24",
                }}
              >
                {getTypePrixSuffix()}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {product.tags?.length > 0 && (
          <div
            style={{
              marginTop: "6px",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
            }}
          >
            {product.tags.slice(0, 2).map((t) => {
              const tag = t.trim();
              return (
                <span
                  key={tag}
                  style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    lineHeight: 1.1,
                  }}
                >
                  #{tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Bouton */}
        {onAddToCart && (
          <>
            {isOutOfStock ? (
              // 👉 Affichage clair en cas de rupture
              <div
                className="w-full rounded-md border border-dashed flex items-center justify-center"
                style={{
                  marginTop: "8px",
                  padding: "7px 10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#fecaca", // rouge clair
                  borderColor: "rgba(248,113,113,0.6)", // rouge
                }}
              >
                Rupture de stock
              </div>
            ) : (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (adding) return;

                  setAdding(true);

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
                    await onAddToCart(product.id, 1);

                    Swal.fire({
                      icon: "success",
                      title: "Ajouté !",
                      timer: 900,
                      showConfirmButton: false,
                    });
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
                disabled={adding}
                className="w-full font-semibold bg-white text-[#2D8A47]
                           rounded-md shadow hover:bg-[#F9FAFB] transition
                           flex items-center justify-center gap-2"
                style={{
                  marginTop: "8px",
                  padding: "7px 10px",
                  fontSize: "13px",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2D8A47"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                </svg>
                Ajouter au panier
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
