// UserDashboard.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  CreditCard,
  Heart,
  ShoppingBag,
  Package,
  LogOut,
  Home,
  ArrowLeft,
  Star,
  ShoppingCart,
  BarChart3
} from "lucide-react";
import "../styles/AdminDashboard.css";
import ClientDashboardPage, { ClientTab } from "./clientDashboard";
import VendorDashboard from "./vendorDashboard";
import { UserData } from "../config/authStorage";
import axios from "axios";
import { API_BASE_URL } from '../config/api';

interface Props {
  currentUser: UserData;
  onLogout: () => void;
}

type ProfileUser = {
  id: string;
  role: string;            
  name: string;
  email?: string | null;
  tel?: string | null;
  adresse?: string | null;
  storeName?: string | null;
  type: "client" | "vendor";
};

export default function UserDashboard({ currentUser, onLogout }: Props) {

  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileUser | null>(null);

  // Onglet actif principal (client ou vendeur)
  const [activeTab, setActiveTab] = useState<"client-dashboard" |
    "client-orders" |
    "client-wishlist" |
    "client-wallet" |
    "client-profile" |
    "vendor" |
    "vendor-products" |
    "vendor-sponsors" |
    "vendor-orders" |
    "vendor-analytics">(
    currentUser.role === "vendor" ? "vendor" : "client-dashboard"
  );

  const handleViewChange = (view: typeof activeTab) => {
    setActiveTab(view);
  };

  useEffect(() => {
    setActiveTab(currentUser.role === "vendor" ? "vendor" : "client-dashboard");
    loadFullProfile();
  }, []);

  const loadFullProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/${currentUser.id}`);
      const api = res.data;

      setProfile({
        id: api.id,          
        role: api.role,

        name: api.name,
        email: api.email,
        tel: api.tel,
        adresse: api.adresse,
        storeName: api.storeName,

        type: api.role === "vendor" ? "vendor" : "client",
      });
    } catch (err) {
      console.error("Erreur récupération profil:", err);
    }
  };
  
  useEffect(() => {
    sessionStorage.setItem("userActiveTab", activeTab);
  }, [activeTab]);

  
  const getBreadcrumb = () => {
    // Si onglet client
    if (activeTab.startsWith("client")) {
      const clientTitles: Record<string, string> = {
        "client-dashboard": "Espace Client",
        "client-orders": "Mes commandes",
        "client-wishlist": "Mes favoris",
        "client-wallet": "Mon wallet",
        "client-profile": "Mon profil",
      };

      return (
        <>
          Espace Client &gt;
          <span className="text-blue-600 font-medium">
            {" "}{clientTitles[activeTab]}
          </span>
        </>
      );
    }

    // Si onglet vendeur
    const vendorTitles: Record<string, string> = {
      vendor: "Vue d’ensemble",
      "vendor-products": "Produits",
      "vendor-sponsors": "Sponsors",
      "vendor-orders": "Commandes", 
      "vendor-analytics": "Analyses"
    };

   return (
    <>
      Espace Vendeur &gt;
      <span className="text-blue-600 font-medium">  {vendorTitles[activeTab]}</span>
    </>
  );
  };

  const getPageTitle = () => {
    // TITRES CLIENT
    if (activeTab.startsWith("client")) {
      const clientTitles: Record<string, string> = {
        "client-dashboard": "Espace Client",
        "client-orders": "Mes commandes",
        "client-wishlist": "Mes favoris",
        "client-wallet": "Mon wallet",
        "client-profile": "Mon profil",
      };

      return clientTitles[activeTab] ?? "Espace Client";
    }

    
    const vendorTitles: Record<string, string> = {
    vendor: "Vue d’ensemble",
    "vendor-products": "Produits",
    "vendor-sponsors": "Sponsors",
    "vendor-orders": "Commandes",
    "vendor-analytics": "Analyses",
  };

  return vendorTitles[activeTab] ?? "Espace Vendeur";
};
  
  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ------------ SIDEBAR ------------ */}
      <aside className="sidebar">

        <div className="sidebar-header">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Home size={20} /> Tableau de bord
          </h1>
          <p className="text-xs text-white text-opacity-75">Tsena.mg</p>
        </div>

        <nav className="sidebar-nav">

          {/* ---- ACCUEIL ---- */}
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all"
          >
            <ArrowLeft size={20} />
            <span>Accueil</span>
          </button>

          {/* ---- ESPACE CLIENT ---- */}
          <div className="mt-6 mb-2 px-4 text-xs font-semibold uppercase text-white text-opacity-60">
            Espace client
          </div>

          <button
            onClick={() => setActiveTab("client-dashboard")}
            className={`sub-btn ${activeTab === "client-dashboard" ? "active" : ""}`}
          >
            Tableau de bord
            <div className={`ml-auto ${activeTab === "client-dashboard" ? "icon-active" : "icon-inactive"}`}>
              <BarChart3 size={16} />
            </div>
          </button>

          <button
            onClick={() => setActiveTab("client-orders")}
            className={`sub-btn ${activeTab === "client-orders" ? "active" : ""}`}
          >
            Commandes
            <div className={`ml-auto ${activeTab === "client-orders" ? "icon-active" : "icon-inactive"}`}>
              <ShoppingBag size={16} />
            </div>
          </button>

          <button
            onClick={() => setActiveTab("client-wishlist")}
            className={`sub-btn ${activeTab === "client-wishlist" ? "active" : ""}`}
          >
            Favoris
            <div className={`ml-auto ${activeTab === "client-wishlist" ? "icon-active" : "icon-inactive"}`}>
              <Heart size={16} />
            </div>
          </button>

          {/* <button
            onClick={() => setActiveTab("client-wallet")}
            className={`sub-btn ${activeTab === "client-wallet" ? "active" : ""}`}
          >
            Wallet
            <div className={`ml-auto ${activeTab === "client-wallet" ? "icon-active" : "icon-inactive"}`}>
              <CreditCard size={16} />
            </div>
          </button> */}

          <button
            onClick={() => setActiveTab("client-profile")}
            className={`sub-btn ${activeTab === "client-profile" ? "active" : ""}`}
          >
            Profil
            <div className={`ml-auto ${activeTab === "client-profile" ? "icon-active" : "icon-inactive"}`}>
              <User size={16} />
            </div>
          </button>

          {/* ---- LABEL vendeur (pas un bouton) ---- */}
          {currentUser.role === "vendor" && (
            <div className="mt-6 mb-2 px-4 text-xs font-semibold uppercase text-white text-opacity-60">
              Espace vendeur
            </div>
          )}

          {/* ---- Sous-pages vendeur ---- */}
          {currentUser.role === "vendor" && (
            <>
              <button
                onClick={() => setActiveTab("vendor")}
                className={`sub-btn ${activeTab === "vendor" ? "active" : ""}`}
              >
                Vue d’ensemble
                <div className={`ml-auto ${activeTab === "vendor" ? "icon-active" : "icon-inactive"}`}>
                  <BarChart3 size={16} />
                </div>
              </button>

              <button
                onClick={() => setActiveTab("vendor-products")}
                className={`sub-btn ${activeTab === "vendor-products" ? "active" : ""}`}
              >                
                Produits
                  <div className={`ml-auto ${activeTab === "vendor-products" ? "icon-active" : "icon-inactive"}`}>
                    <Package size={16} />
                  </div>                
              </button>

              <button
                onClick={() => setActiveTab("vendor-sponsors")}
                className={`sub-btn ${activeTab === "vendor-sponsors" ? "active" : ""}`}
              >
                Sponsors
                <div className={`ml-auto ${activeTab === "vendor-sponsors" ? "icon-active" : "icon-inactive"}`}>
                  <Star size={16} />
                </div>
              </button>

              <button
                onClick={() => setActiveTab("vendor-orders")}
                className={`sub-btn ${activeTab === "vendor-orders" ? "active" : ""}`}
              >
                Commandes
                <div className={`ml-auto ${activeTab === "vendor-orders" ? "icon-active" : "icon-inactive"}`}>
                  <ShoppingCart size={16} />
                </div>
              </button>


              {/* <button
                onClick={() => setActiveTab("vendor-analytics")}
                className={`sub-btn ${activeTab === "vendor-analytics" ? "active" : ""}`}
              >
                Analyses
                <div className={`ml-auto ${activeTab === "vendor-analytics" ? "icon-active" : "icon-inactive"}`}>
                  <BarChart3 size={16} />
                </div>
              </button> */}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => { sessionStorage.removeItem("userActiveTab"); onLogout();}}>
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ------------ CONTENU ------------ */}
      <div className="flex-1">

        {/* HEADER */}
        <header className="header-horizontal">
          <div className="header-content">
            <div className="header-left">
              <h2 className="font-bold text-xl">{getPageTitle()}</h2>
              <p className="text-sm text-gray-500">{getBreadcrumb()}</p>
            </div>
            <div className="header-right">
              <p>Bienvenue {currentUser.name}</p>
              <p>{new Date().toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
        </header>

        {/* CONTENU */}
        <main className="p-6 w-full max-w-[1550px] mx-auto">

          {activeTab.startsWith("client") && (
            <ClientDashboardPage
              profileUser={profile}
              activeTab={activeTab as ClientTab} 
              onChangeTab={setActiveTab}
            />
          )}

          {activeTab.startsWith("vendor") && currentUser.role === "vendor" && (
            <VendorDashboard
              currentUser={{ ...currentUser, type: "vendor" }}
              activeView={activeTab}      
              onChangeView={handleViewChange}
            />
          )}

        </main>
      </div>

    </div>
  );
}
