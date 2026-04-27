import React, { useState, useEffect } from "react";
import { Megaphone, Truck, Shield, HeartHandshake } from "lucide-react";
import axios from "axios";
import "../styles/promoBanner.css";
import { VendorAuthModal } from '../components/vendorAuthModal';
import { ProductDetailModal, ProductDetailData } from "./productDetailModal";
import { StatusBadge } from "../components/StatusBadge";
import { API_BASE_URL } from "../config/api";
import { UserData } from "../config/authStorage";

export function PromoBanner({ isPublicHome = false, onAddToCart, onVendorLogin }: { isPublicHome?: boolean, onAddToCart?: (productId: string, qty?: number) => void | Promise<void>; onVendorLogin?: (user: UserData) => void; }) {

  const [slides, setSlides] = useState<any[]>([]);
  const [productIndex, setProductIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);


  // --- Load sponsors ---
  useEffect(() => {
    async function load() {
      const res = await axios.get(`${API_BASE_URL}/api/sponsor`);

      setSlides(
        res.data.map((item: any) => ({
          id: item.produitId,
          title: item.title,
          desc: item.desc,
          price: item.price,
          images: item.images,
          tags: item.tags,
          category: item.category,
          typeProduit: item.typeProduit,
          typePrix: item.typePrix 
        }))
      );
    }
    load();
  }, []);

  // --- Discount changes ONLY when product changes ---
  const [discount, setDiscount] = useState(0);
  const [oldPrice, setOldPrice] = useState(0);

  useEffect(() => {
    if (slides.length === 0) return;

    const reductions = [10, 15, 17];
    const newDiscount = reductions[Math.floor(Math.random() * reductions.length)];

    setDiscount(newDiscount);

    const base = slides[productIndex].price;
    setOldPrice(Math.round(base / (1 - newDiscount / 100)));

  }, [productIndex, slides]);

  // --- Auto image change ---
  useEffect(() => {
    if (slides.length === 0) return;

    const totalImages = slides[productIndex].images.length;

    const interval = setInterval(() => {
      setImageIndex(prev => {
        if (prev + 1 < totalImages) return prev + 1;

        setProductIndex(p => (p + 1) % slides.length);
        return 0;
      });
    }, 3000);

    return () => clearInterval(interval);

  }, [slides, productIndex]);

  if (slides.length === 0) {
    return (
      <div className="promo-banner loading">
        Bannière en chargement…
      </div>
    );
  }

  const slide = slides[productIndex];
  const currentImage = slide.images[imageIndex];

  // Format label typePrix
  const prixLabel =
    slide.typePrix === "journalier"
      ? "jour"
      : slide.typePrix === "hebdomadaire"
      ? "semaine"
      : slide.typePrix === "mensuel"
      ? "mois"
      : "";

  const openDetailFromSlide = async (slide: any) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);

    // preview immédiat
    setSelectedProduct({
      id: slide.id,
      nom: slide.title,
      prix: slide.price,
      stock: 0,
      images: slide.images ?? [],
      tags: slide.tags ?? [],
      descriptions: slide.desc ?? "",
      poids: 0,
      dimensions: "",
      materiaux: "",
      isLocation: slide.typeProduit === "location",
      categorie: slide.category ? { nomCat: slide.category } : undefined,
      magasin: undefined,
      produitLocation: null,
      Sponsor: true, 
    } as ProductDetailData);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/getDetails/${slide.id}`);
      const data = res.data.product ?? res.data;
      setSelectedProduct(data);
    } catch (e) {
      console.error("Erreur chargement détails sponsor", e);
      setDetailError("Impossible de charger les détails.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedProduct(null);
    setDetailLoading(false);
    setDetailError(null);
  };
  
  return (
    <>
      <div className="promo-banner">

        {/* IMAGE */}
        <div className="promo-image">
          <img src={currentImage} />

          <div className="promo-badge">
            <Megaphone size={14} /> Sponsorisé
          </div>

          <div className="dots">
            {slide.images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setImageIndex(idx)}
                className={idx === imageIndex ? "dot-active" : "dot-inactive"}
              />
            ))}
          </div>

          <div className="preview-full">
            <img src={currentImage} />
          </div>
        </div>

        {/* DETAILS */}
        <div className="promo-details">

          {/* Catégorie */}
          <h3 className="promo-cat">{slide.category}</h3>

          {/* Titre + badge */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "3px"
          }}>
            <h1 className="promo-title">{slide.title}</h1>

            <div style={{ transform: "scale(1.3)", transformOrigin: "right center" }}>
              <StatusBadge status={slide.typeProduit} />
            </div>

          </div>

          {/* Description */}
          <p className="promo-desc">
            {slide.desc.length > 80 ? slide.desc.substring(0, 78) + "..." : slide.desc}
          </p>

          {/* PRIX (superposé + typePrix) */}
          <div className="price-wrapper">
            <span className="promo-price">
              {slide.price} Ar
              {slide.typeProduit === "location" && prixLabel && (
                <span style={{ fontSize: "14px", marginLeft: "4px" }}>
                  / {prixLabel}
                </span>
              )}
            </span>

            <div className="price-side">
              <span className="old-price">{oldPrice} Ar</span>
              <span className="discount-badge">-{discount}%</span>
            </div>
          </div>

          {/* Tags */}
          <div className="promo-tags">
            {slide.tags.slice(0, 3).map((tag: string, i: number) => (
              <span key={i} className="tag">#{tag.trim()}</span>
            ))}
          </div>

          <div className="promo-buttons">
            <button className="promo-btn"
              onClick={() => openDetailFromSlide(slide)}
            >Voir le produit →</button>

            {isPublicHome && (
              <button
                className="seller-btn"
                onClick={() => setIsVendorModalOpen(true)}
              >
                Devenir vendeur
              </button>
            )}
          </div>
        </div>
        {/* modal de vendeur */}
        <VendorAuthModal
          isOpen={isVendorModalOpen}
          onClose={() => setIsVendorModalOpen(false)}
          onLogin={(user) => {
            console.log("Vendeur connecté depuis PromoBanner", user);
            setIsVendorModalOpen(false);
            if (onVendorLogin) {
              onVendorLogin(user);
            }
          }}
        />
      </div>
      {isDetailOpen && (
        <ProductDetailModal
          product={selectedProduct}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
          onAddToCart={(id, qty) => onAddToCart?.(id, qty)}
        />
      )}
      
      {/* STRIP ICONES */}
      <div className="bg-white border-b mt-0">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="flex items-center space-x-3">
              <div className="bg-[#2D8A47] bg-opacity-10 p-3 rounded-full">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium">Livraison rapide</h3>
                <p className="text-sm text-gray-600">Tana : 24–72h • Province : 5–14 jours</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-[#FFA726] bg-opacity-10 p-3 rounded-full">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium">Paiement sécurisé</h3>
                <p className="text-sm text-gray-600">Carte Visa & Mastercard via Stripe</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 bg-opacity-10 p-3 rounded-full">
                <HeartHandshake className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium">Commerce équitable</h3>
                <p className="text-sm text-gray-600">Soutien aux artisans</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
