import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { PromoBanner } from '../components/PromoBanner';
import { ProductGrid } from '../components/productGrid';
import { VendorAuthModal } from '../components/vendorAuthModal';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';
import { UserData } from '../config/authStorage';
import axios from 'axios';

type Page = 'home' | 'search';
type ProductFilter = 'all' | 'services';

interface HomePublicProps {
  currentUser: UserData | null;
  onLogin: (user: UserData) => void;
}

export default function HomePublic({ currentUser, onLogin, }: HomePublicProps) {

  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const produitsRef = useRef<HTMLDivElement | null>(null);
  
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

  // -------------------------
  // Login
  // -------------------------

  const handleLoginSuccess = (user: UserData) => {
    onLogin(user);
    navigate('/dashboard');  // redirection une fois connecté
  };

  const handlePublicAddToCart = async (productId: string) => {
    toast.error("Connectez-vous pour ajouter au panier");
    setIsAuthModalOpen(true);
  };

  // -------------------------
  // RENDER HOME PUBLIC
  // -------------------------

  return (
    <>
      {/* ---------------- HEADER ---------------- */}
      <Header
        cartItemCount={0}
        currentUser={null} // 🔥 Public = jamais connecté
        onLoginClick={() => setIsAuthModalOpen(true)}
        onCartClick={() => {
          toast.error("Connectez-vous pour voir votre panier");
          setIsAuthModalOpen(true);
        }}
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

            produitsRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          } else if (section === 'categories') {
            setProductFilter('all');
            setShowCategoryFilter(prev => !prev);
            // 👉 pas de scroll
          } else {
            // offers ou autre
            setProductFilter('all');
            setShowCategoryFilter(false);
            setSelectedCategoryId('all');

            produitsRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }}
        onProfileClick={() => {
          toast.error("Connexion requise");
          setIsAuthModalOpen(true);
        }}
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

      {/* ---------------- MODAL LOGIN ---------------- */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLoginSuccess}
      />

      {/* ---------------- MODAL VENDOR ---------------- */}
      <VendorAuthModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onLogin={handleLoginSuccess}
      />

      {/* ---------------- HERO + PROMO ---------------- */}
      <main>
        <PromoBanner isPublicHome={true} onAddToCart={handlePublicAddToCart} onVendorLogin={handleLoginSuccess}/>

        {/* ---------------- PRODUITS POPULAIRES ---------------- */}
        <div ref={produitsRef}>
          <ProductGrid
            onAddToCart={handlePublicAddToCart}
            filterMode={productFilter}
            category={selectedCategoryId === 'all' ? null : selectedCategoryId}
            searchQuery={searchQuery}
            />
        </div>

        {/* ---------------- VENDEURS PARTENAIRES ---------------- */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Nos vendeurs partenaires
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Découvrez les artisans et entreprises qui font la richesse de Madagascar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              <div className="text-center">
                <div className="bg-[#2D8A47] bg-opacity-10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🏺</span>
                </div>
                <h3 className="font-semibold mb-2">Artisans traditionnels</h3>
                <p className="text-gray-600 text-sm">Bijoux, tissus, objets faits main.</p>
              </div>

              <div className="text-center">
                <div className="bg-[#FFA726] bg-opacity-10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🏪</span>
                </div>
                <h3 className="font-semibold mb-2">PME locales</h3>
                <p className="text-gray-600 text-sm">Produits alimentaires & cosmétiques.</p>
              </div>

              <div className="text-center">
                <div className="bg-blue-500 bg-opacity-10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👥</span>
                </div>
                <h3 className="font-semibold mb-2">Freelances</h3>
                <p className="text-gray-600 text-sm">Services digitaux, créatifs & tech.</p>
              </div>

            </div>

            <div className="text-center mt-12">
              <button
                onClick={() => setIsVendorModalOpen(true)}
                className="bg-[#2D8A47] text-white px-6 py-3 rounded-lg hover:bg-[#245A35] transition-colors"
              >
                Devenir vendeur
              </button>
            </div>
          </div>
        </section>

        {/* ---------------- FOOTER ---------------- */}
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
