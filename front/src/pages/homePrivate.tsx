import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../components/Header';
import { PromoBanner } from '../components/PromoBanner';
import { ProductGrid } from '../components/productGrid';
import { CartModal } from '../components/CartModal';
import { useCart } from "../context/cartContext";
import { UserData } from '../config/authStorage';
import Swal from 'sweetalert2';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';

type Page = 'home' | 'search';

interface HomePrivateProps {
  currentUser: UserData;
  onLogout: () => void;
}

type ProductFilter = 'all' | 'services';

export default function HomePrivate({currentUser, onLogout }: HomePrivateProps) {

  const navigate = useNavigate();
  const { itemCount, addToCart, refreshCart } = useCart();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const produitsRef = useRef<HTMLDivElement | null>(null);
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [categories, setCategories] = useState<{ id: string; nom: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/getCategories`);
        setCategories(res.data);
      } catch (err) {
        console.error("Erreur récupération catégories:", err);
      }
    };
    fetchCategories();
  }, []);
  
  useEffect(() => {
  const url = new URL(window.location.href);
  const payment = url.searchParams.get("payment");
  const sessionId = url.searchParams.get("session_id");

  if (payment === "success" && sessionId) {
    // 1) Nettoyer l’URL
    url.searchParams.delete("payment");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.pathname + url.search);

    // 2) SweetAlert (visuel identique) + confirmation en arrière-plan
    (async () => {
      const result = await Swal.fire({
        title: "Paiement réussi 🎉",
        text: "Clique sur OK pour finaliser ta commande et recevoir ta facture.",
        icon: "success",
        confirmButtonText: "OK",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: false,
      });

      if (result.isConfirmed) {

        axios.post(`${API_BASE_URL}/payments/confirm-order`, {
          session_id: sessionId,
        })
          .then(async ({ data }) => {
            await refreshCart?.();
            toast.success("Commande finalisée, facture envoyée par email", {
            });
          })
          .catch((e: any) => {
            const msg =
              e?.response?.data?.error ||
              e?.message ||
              "Impossible de confirmer le paiement";
          });
      }
    })();
  }
}, [refreshCart]);
  
  // ---------------------------
  // HOME PRIVATE
  // ---------------------------

  return (
    <>
      {/* HEADER simplifié */}
      <Header
        cartItemCount={itemCount}
        currentUser={currentUser}  
        onLoginClick={() => {}}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={(query) => {               
          setCurrentPage('search');
          setSearchQuery(query);
          produitsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }}
        onNavigationClick={(section) => {
          if (section === 'services') {
            setProductFilter('services');
            setShowCategoryFilter(false);
            setSelectedCategoryId('all');
          } else if (section === 'categories') {
            // 👉 juste ouvrir le filtre, PAS de scroll/redirection
            setProductFilter('all');
            setShowCategoryFilter((prev) => !prev); // toggle
          } else {
            // "offers" ou autre
            setProductFilter('all');
            setShowCategoryFilter(false);
            setSelectedCategoryId('all');
          }

          // 👉 on scroll SEULEMENT si ce n'est PAS "categories"
          if (section !== 'categories') {
            produitsRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }}
        onProfileClick={() => navigate('/dashboard')}
        onLogoutClick={onLogout}
      />
      {/* 🔹 Barre de filtre catégories sous le header (simple, non flottant) */}
      {showCategoryFilter && (
        <div className="bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 py-2 flex items-center gap-2">

            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="
                border border-gray-300 
                rounded-md 
                px-3 py-1.5 
                text-sm 
                bg-white
                focus:outline-none
                focus:ring-2
                focus:ring-[#2D8A47]/40
              "
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.nom}>
                  {cat.nom}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowCategoryFilter(false)}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* MODAL PANIER FLOTTANT */}
      <CartModal
        isOpen={isCartOpen}
        currentUser={currentUser}
        onClose={() => setIsCartOpen(false)}
      />

      <main>

        {/* ---------------- PROMO adaptée (sans CTA login) ---------------- */}
        <PromoBanner isPublicHome={false} onAddToCart={(id) => addToCart(id, 1)}/>

        {/* ---------------- PRODUITS ---------------- */}
        <div ref={produitsRef}>
          <ProductGrid
            onAddToCart={(id, qty) => addToCart(id, qty ?? 1)} userId={currentUser.id} filterMode={productFilter}
            category={selectedCategoryId === 'all' ? null : selectedCategoryId}
            searchQuery={searchQuery}
            />
        </div>

        {/* ---------------- QUICK SERVICES (adapté connecté) ---------------- */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-6">Accès rapide</h2>

            <div className="flex flex-wrap justify-center gap-6">
              
              {/* DASHBOARD */}
              <button
                className="p-6 border rounded-lg hover:shadow-md transition text-center"
                onClick={() => navigate('/dashboard')}
              >
                <div className="text-4xl mb-3">📊</div>
                <h3 className="font-semibold">Mon compte</h3>
                <p className="text-gray-600 text-sm">Profil, commandes, favoris</p>
              </button>

              {/* PANIER */}
              <button
                className="p-6 border rounded-lg hover:shadow-md transition text-center"
                onClick={() => setIsCartOpen(true)}
              >
                <div className="text-4xl mb-3">🛒</div>
                <h3 className="font-semibold">Mon panier</h3>
                <p className="text-gray-600 text-sm">Voir et valider ma commande</p>
              </button>

              {/* VENTES */}
              {currentUser.role === 'vendor' && (
                <button
                  className="p-6 border rounded-lg hover:shadow-md transition text-center"
                  onClick={() => navigate('/dashboard')}
                >
                  <div className="text-4xl mb-3">🏪</div>
                  <h3 className="font-semibold">Espace vendeur</h3>
                  <p className="text-gray-600 text-sm">Gérer ma boutique</p>
                </button>
              )}

            </div>
          </div>
        </section>

        {/* ---------------- FOOTER minimal ---------------- */}
        <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-[#4CAF50] mb-4">TsenaGasy</h3>
              <p className="text-gray-300 text-sm mb-4">
                La marketplace qui valorise l'économie malgache et connecte acheteurs et vendeurs locaux.
              </p>
              <div className="flex space-x-4">
                <span className="text-2xl cursor-pointer hover:text-[#4CAF50]">📘</span>
                <span className="text-2xl cursor-pointer hover:text-[#4CAF50]">📷</span>
                <span className="text-2xl cursor-pointer hover:text-[#4CAF50]">🐦</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Acheteurs</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">Comment acheter</a></li>
                <li><a href="#" className="hover:text-white">Paiements</a></li>
                <li><a href="#" className="hover:text-white">Livraisons</a></li>
                <li><a href="#" className="hover:text-white">Retours</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Vendeurs</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">Devenir vendeur</a></li>
                <li><a href="#" className="hover:text-white">Guide du vendeur</a></li>
                <li><a href="#" className="hover:text-white">Frais et commissions</a></li>
                <li><a href="#" className="hover:text-white">Support vendeur</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-white">Nous contacter</a></li>
                <li><a href="#" className="hover:text-white">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-white">Politique de confidentialité</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Tsena.mg - Made with ❤️ in Madagascar
            </p>
          </div>
        </div>
      </footer>

      </main>
    </>
  );
}
