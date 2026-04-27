import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
   X, Lock, Heart, CreditCard, User, Bell, Settings,
  ShoppingBag, Clock, Star, ChevronRight
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent } from "../components/ui/tabs";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { StatusBadge } from "../components/StatusBadge";
import { RechargeWalletModal } from "../components/RechargeWalletModal";
import { toast } from "sonner";
import { ProductDetailModal } from "../components/productDetailModal";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import Swal from "sweetalert2";
import { useCart } from "../context/cartContext";

interface ClientDashboardPageProps {
  profileUser: ProfileUser | null;
  activeTab: ClientTab;
  onChangeTab: (view: ClientTab) => void;
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

 export type ClientTab =
  | "client-dashboard"
  | "client-orders"
  | "client-wishlist"
  | "client-wallet"
  | "client-profile";

type Order = {
  id: string;                        // toujours présent (getMyOrders)
  dateVente: string;
  statut: string;
  total: number;
  facture_numero?: string | null;
  facture_url?: string | null;

  livraison?: {
    adresse_livraison: string;
    contact_phone: string;
    mode: string;
    frais_livraison?: number;
  } | null;

  paiement?: {
    mode: string;
    statut: string;
  } | null;

  lignes: Array<{
    id: string;
    quantite: number;
    prix_Unitaire: number;
    total: number;
    produit: { nom: string };
  }>;
};

export default function ClientDashboardPage({ profileUser, activeTab, onChangeTab }: ClientDashboardPageProps) {
  // const [walletBalance, setWalletBalance] = useState(25000);
  // const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const isVendor = profileUser?.role === "vendor";
  const [isFavModalOpen, setIsFavModalOpen] = useState(false);
  const [favSelectedProduct, setFavSelectedProduct] = useState<any | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [favCountLoading, setFavCountLoading] = useState(false);
  const { addToCart } = useCart();
  const [addingFavIds, setAddingFavIds] = useState<Set<string>>(new Set());
  const [addedFavIds, setAddedFavIds] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [name, setName] = useState(profileUser?.name ?? "");
  const [email, setEmail] = useState(profileUser?.email ?? "");
  const [address, setAddress] = useState(profileUser?.adresse ?? "");
  const [tel, setTel] = useState(profileUser?.tel ?? "");
  const [storeName, setStoreName] = useState(profileUser?.storeName ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [orderViewMode, setOrderViewMode] = useState<"prep" | "delivered">("prep");

  
  useEffect(() => {
    setName(profileUser?.name ?? "");
    setEmail(profileUser?.email ?? "");
    setAddress(profileUser?.adresse ?? "");
    setTel(profileUser?.tel ?? "");
    setStoreName(profileUser?.storeName ?? "");
  }, [profileUser]);

  useEffect(() => {
    setOldPassword("");
    setNewPassword("");
  }, [activeTab]);
  
  useEffect(() => {
    if (!profileUser?.id) return;
    //stat fav
    const loadFavCount = async () => {
      try {
        setFavCountLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/api/favCount/${profileUser.id}`
        );
        setFavCount(res.data?.count ?? 0);
      } catch (e) {
        console.error("Erreur chargement favCount", e);
        setFavCount(0);
      } finally {
        setFavCountLoading(false);
      }
    };

    loadFavCount();
    //commandes
    const loadOrders = async () => {
      try {
        setOrdersLoading(true);
        const res = await axios.get(`${API_BASE_URL}/orders/${profileUser.id}`);
        setOrders(res.data || []);
      } catch (e) {
        console.error("Erreur chargement commandes", e);
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
    //fav
    const loadWishlist = async () => {
      try {
        setWishlistLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/api/getFavByUser/${profileUser.id}`
        );
        setWishlist(res.data || []);
      } catch (e) {
        console.error("Erreur chargement favoris", e);
      } finally {
        setWishlistLoading(false);
      }
    };

    loadWishlist();
  }, [profileUser?.id]);
  
  // const [transactions, setTransactions] = useState([
  //   {
  //     id: "1",
  //     type: "recharge",
  //     description: "Recharge MVola",
  //     amount: 50000,
  //     date: "2024-01-15T14:30:00",
  //   },
  //   {
  //     id: "2",
  //     type: "purchase",
  //     description: "Achat produit",
  //     amount: -25000,
  //     date: "2024-01-14T16:45:00",
  //   },
  // ]);

  type WishlistItemCard = {
    id: string;
    nom: string;
    prix: number;
    image?: string;
    categorie?: string;
    magasin?: string;
    isLocation?: boolean;
    typePrix?: string;
  };

  const wishlistCards: WishlistItemCard[] = wishlist.map((p: any) => ({
    id: p.id,
    nom: p.nom,
    prix: p.prix,
    image: p.images?.[0],
    categorie: p.categorie?.nomCat,
    magasin: p.magasin?.nom_Magasin,
    isLocation: p.isLocation,
    typePrix: p.produitLocation?.typePrix,
  }));

  const openFavModal = (id: string) => {
    const full = wishlist.find((p: any) => p.id === id);
    if (!full) return;

    setFavSelectedProduct(full);
    setIsFavModalOpen(true);
  };

  const closeFavModal = () => {
    setIsFavModalOpen(false);
    setFavSelectedProduct(null);
  };

  const handleRemoveFav = async (produitId: string, produitNom?: string) => {
    await Swal.fire({
      title: "Supprimer ce favori ?",
      text: produitNom
        ? `Voulez-vous retirer "${produitNom}" de vos favoris ?`
        : "Voulez-vous retirer ce produit de vos favoris ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await axios.delete(
            `${API_BASE_URL}/api/removeFav/${profileUser?.id}/${produitId}`
          );
          return true;
        } catch (error) {
          console.error("Erreur suppression favori:", error);
          Swal.showValidationMessage("Erreur lors de la suppression.");
          return false;
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // update UI
        setWishlist((prev) => prev.filter((p) => p.id !== produitId));

        toast.success("Favori supprimé avec succès !");
        setFavCount((c) => Math.max(0, c - 1));
      }
    });
  };

  const formatTypePrix = (typePrix?: string) => {
    if (!typePrix) return "";

    switch (typePrix) {
      case "journalier":
        return "jour";
      case "hebdomadaire":
        return "semaine";
      case "mensuel":
        return "mois";
      default:
        return "";
    }
  };

  const handleAddFavToCart = async (
  produitId: string,
  qty = 1,                 // ✅ par défaut = 1
  isLocation?: boolean
) => {
  // évite double clic / double appel
  if (addingFavIds.has(produitId)) return;

  setAddingFavIds(prev => new Set(prev).add(produitId));

  try {
    // si modal -> qty est passé
    // si bouton simple -> qty reste 1
    await addToCart(produitId, qty);

    setAddingFavIds(prev => {
      const s = new Set(prev);
      s.delete(produitId);
      return s;
    });

    setAddedFavIds(prev => new Set(prev).add(produitId));

    setTimeout(() => {
      setAddedFavIds(prev => {
        const s = new Set(prev);
        s.delete(produitId);
        return s;
      });
    }, 2000);

  } catch (e: any) {
    setAddingFavIds(prev => {
      const s = new Set(prev);
      s.delete(produitId);
      return s;
    });

    console.error(e);
  }
  };
  
  const downloadFacture = async (url?: string | null, factureNumero?: string | null) => {
    if (!url) {
      toast.error("Facture indisponible.");
      return;
    }

    try {
      // base serveur SANS /api
      const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

      const isAbsolute = /^https?:\/\//i.test(url);
      const clean = url.replace(/^\/+/, "");
      const fullUrl = isAbsolute ? url : `${SERVER_BASE_URL}/${clean}`;

      const res = await fetch(fullUrl);
      if (!res.ok) {
        console.error("PDF fetch status =", res.status, fullUrl);
        throw new Error("Fetch PDF failed");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${factureNumero ?? "facture"}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de télécharger la facture.");
    }
  };
  
  const handleDeleteOrder = async (orderId: string, factureNumero?: string | null) => {
    await Swal.fire({
      title: "Supprimer cette commande ?",
      text: factureNumero
        ? `Voulez-vous supprimer la commande liée à la facture "${factureNumero}" ?`
        : "Voulez-vous supprimer cette commande ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await axios.put(`${API_BASE_URL}/orders/hide/${orderId}`);
          return true;
        } catch (err: any) {
          console.error("Erreur suppression commande:", err);
          Swal.showValidationMessage(
            err?.response?.data?.error || "Erreur lors de la suppression."
          );
          return false;
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        toast.success("Commande supprimée !");
      }
    });
  };

  const ordersPrep = orders.filter(o => o.statut.toLowerCase() !== "expedie");
  const ordersDelivered = orders.filter(o => o.statut.toLowerCase() === "expedie");

  const visibleOrders = orderViewMode === "prep" ? ordersPrep : ordersDelivered;

 const renderDashboard = () => (
    <>
      {/* --- CARDS PRINCIPALES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

        {/* COMMANDES */}
        <Card
          className="!bg-transparent bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg cursor-pointer hover:scale-[1.02] transition"
          onClick={() => onChangeTab("client-orders")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-100">Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3">
                <ShoppingBag className="h-6 w-6" style={{ color: "#3B82F6" }}/>
              </div>
              <div>
                <div className="text-3xl font-bold">{orders.length}</div>
                <p className="text-xs text-blue-100 mt-1 opacity-90">
                  Commandes passées
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAVORIS */}
        <Card
          className="bg-gradient-to-br from-pink-500 to-red-500 text-white border-0 shadow-lg cursor-pointer hover:scale-[1.02] transition"
          onClick={() => onChangeTab("client-wishlist")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-pink-100">Favoris</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3">
                <Heart className="h-6 w-6" style={{ color: "#EC4899" }}/>
              </div>
              <div>
                <div className="text-3xl font-bold">{favCountLoading ? 0 : favCount}</div>
                <p className="text-xs text-pink-100 mt-1 opacity-90">
                  Produits aimés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- COMMANDES RÉCENTES (THÈME BLEU) --- */}
      <Card className="border-l-4 border-l-blue-500 shadow-md">
        <CardHeader className="bg-blue-50 to-white">
          <CardTitle className="flex items-center text-blue-600">
            <Clock className="h-5 w-5 mr-2" />
            Commandes récentes
          </CardTitle>
        </CardHeader>

       <CardContent>
         {!ordersLoading && orders.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucune commande pour le moment.
            </p>
         )}
         
         {!ordersLoading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                onClick={() => onChangeTab("client-orders")}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: "white",
                  cursor: "pointer",
                  transition: "0.2s",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, color: "#1d4ed8" }}>
                      {order.facture_numero ?? `Commande #${order.id.slice(0, 6)}`}
                    </span>
                    <StatusBadge status={order.statut} />
                  </div>

                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {new Date(order.dateVente).toLocaleDateString("fr-FR")} •{" "}
                    {order.lignes.length} article(s)
                  </div>
                </div>

                <div style={{ fontWeight: 800, color: "#1d4ed8" }}>
                  {Number(order.total).toLocaleString()} Ar
                </div>
              </div>
            ))}
           </div>
           )}
        </CardContent>
      </Card>
    </>
  );

  const renderOrders = () => (
    <Card className="border-l-4 border-l-blue-500 shadow-md">
      <CardHeader className="bg-blue-50 to-white">
        <CardTitle
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 22,
            fontWeight: 800,
            color: "#1d4ed8",
            letterSpacing: 0.2,
          }}
        >
          <ShoppingBag className="h-5 w-5" />
          Mes commandes
        </CardTitle>
      </CardHeader>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "6px",
          padding: "6px 12px 0px 12px", // 🔥 Réduction massive de l’espace haut/bas + légère marge interne
        }}
      >
        <button
          onClick={() => setOrderViewMode("prep")}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid #d1d5db",
            backgroundColor:
              orderViewMode === "prep" ? "#2563eb" : "#f3f4f6",
            color: orderViewMode === "prep" ? "white" : "#374151",
            transition: "0.2s",
          }}
        >
          En préparation
        </button>

        <button
          onClick={() => setOrderViewMode("delivered")}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid #d1d5db",
            backgroundColor:
              orderViewMode === "delivered" ? "#374151" : "#f3f4f6",
            color: orderViewMode === "delivered" ? "white" : "#374151",
            transition: "0.2s",
          }}
        >
          Livré
        </button>
      </div>
      
      <CardContent>
        {!ordersLoading && orders.length === 0 && (
          <p className="mt-4 text-gray-500">Aucune commande pour le moment.</p>
        )}

        <div className="grid gap-6 mt-3"
          style={{
            gridTemplateColumns: "repeat(2, 1fr)",
          }}>
          {visibleOrders.map((o) => {
            const fraisLivraison = Number(o.livraison?.frais_livraison ?? 0);
            const totalGeneral = Number(o.total);
            const totalProduits = Math.max(0, totalGeneral - fraisLivraison);

            return (
              <Card
                key={o.id}
                className="border rounded-xl bg-white px-4 py-3 hover:shadow-md transition relative"
                style={{
                  borderLeft: "5px solid #2563eb",
                }}
              >
                {/* BOUTON SUPPRESSION (même visuel que favoris)
                    affiché seulement si expedie */}
                {o.statut === "expedie" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOrder(o.id, o.facture_numero);
                    }}
                    title="Supprimer la commande"
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      backgroundColor: "white",
                      border: "1px solid #fca5a5",
                      color: "#db2777",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: "0",
                      zIndex: 5,
                    }}
                  >
                    <X style={{ width: "15px", height: "15px", color: "#db2777" }} />
                  </button>
                )}

                {/* HEADER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 10,
                  }}
                >
                  {/* gauche */}
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>Facture</div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: "#111827" }}>
                      {o.facture_numero ?? "N/A"}
                    </div>
                  </div>

                  {/* droite */}
                  <div style={{ textAlign: "right", fontSize: 11, color: "#6b7280" }}>
                    <div style={{ fontWeight: 700, color: "#374151" }}>
                      Commande {o.id.slice(0, 6)}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      Date : {new Date(o.dateVente).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>

                {/* CONTENU 2 COLONNES */}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {/* GAUCHE : INFOS + TOTAUX */}
                  <div
                    style={{
                      flex: "1 1 280px",
                      fontSize: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#374151" }}>Client</div>
                      <div>{profileUser?.name}</div>
                      <div style={{ color: "#6b7280" }}>{profileUser?.email}</div>
                      {profileUser?.tel && (
                        <div style={{ color: "#6b7280" }}>{profileUser.tel}</div>
                      )}
                    </div>

                    {/* TOTAUX */}
                    <div style={{ marginTop: 6, borderTop: "1px solid #eee", paddingTop: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: "#666" }}>Sous-total produits</span>
                        <span style={{ fontWeight: 600 }}>
                          {totalProduits.toLocaleString()} Ar
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        <span style={{ color: "#666" }}>Livraison</span>
                        <span style={{ fontWeight: 600 }}>
                          {fraisLivraison.toLocaleString()} Ar
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 6,
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>Total général</span>
                        <span style={{ fontWeight: 900, fontSize: 16 }}>
                          {totalGeneral.toLocaleString()} Ar
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DROITE : ARTICLES */}
                  <div
                    style={{
                      flex: "1.2 1 320px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      Articles ({o.lignes.length})
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {o.lignes.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "white",
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: "6px 8px",
                            fontSize: 12,
                          }}
                        >
                          <span
                            style={{
                              maxWidth: "60%",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontWeight: 600,
                            }}
                          >
                            {item.produit.nom}
                          </span>

                          <span style={{ color: "#6b7280" }}>x{item.quantite}</span>

                          <span style={{ fontWeight: 800 }}>
                            {Number(item.total).toLocaleString()} Ar
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <StatusBadge status={o.statut} />

                  <Button
                    size="sm"
                    disabled={!o.facture_url}
                    onClick={() => downloadFacture(o.facture_url, o.facture_numero)}
                    style={{
                      backgroundColor: o.facture_url ? "#ef4444" : "#e5e7eb",
                      color: o.facture_url ? "white" : "#9ca3af",
                      fontWeight: 900,
                      fontSize: 12,
                      height: 30,
                      padding: "0 14px",
                      borderRadius: 10,
                      border: "none",
                      cursor: o.facture_url ? "pointer" : "not-allowed",
                      boxShadow: o.facture_url
                        ? "0 5px 12px rgba(239,68,68,0.35)"
                        : "none",
                    }}
                  >
                    Télécharger PDF
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderWishlist = () => (
    <>
    <Card
      className="shadow-md"
      style={{ borderLeft: "4px solid #ec4899" }} // rose principal
    >
      {/* HEADER */}
      <CardHeader
        style={{
          backgroundColor: "#fdf2f8", // rose très clair
          borderBottom: "1px solid #fbcfe8",
        }}
      >
        <CardTitle className="flex items-center" style={{ color: "#db2777" }}>
          <Heart className="h-5 w-5 mr-2" style={{ color: "#db2777" }} />
          Ma liste de souhaits
        </CardTitle>
      </CardHeader>

      {/* CONTENU */}
      <CardContent>
        {wishlistLoading && <p>Chargement...</p>}

        {!wishlistLoading && wishlistCards.length === 0 && (
          <p className="text-gray-500">Aucun favori pour le moment.</p>
        )}

        {!wishlistLoading && wishlistCards.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlistCards.map((item) => (
              <div
                key={item.id}
                onClick={() => openFavModal(item.id)}
                className="rounded-lg p-4 hover:shadow-lg hover:scale-105 transition relative"
                style={{
                  backgroundColor: "#fdf2f8",
                  border: "1px solid #fbcfe8",
                }}
              >
                {/* BOUTON SUPPRESSION */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFav(item.id, item.nom);
                  }}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    border: "1px solid #fca5a5",
                    color: "#db2777",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: "0",
                  }}
                >
                  <X style={{ width: "15px", height: "15px", color: "#db2777" }} />
                </button>

                {/* IMAGE FIXE */}
                <div className="w-full h-32 rounded-md overflow-hidden bg-white mb-2">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.nom}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      📦
                    </div>
                  )}
                </div>

                {/* NOM */}
                <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                  {item.nom}
                </h4>

                {/* INFOS LÉGÈRES MAIS UTILES */}
                <div className="text-xs text-gray-600 space-y-1 mb-2">
                  {item.categorie && (
                    <p>
                      Catégorie :{" "}
                      <span className="font-medium text-gray-700">{item.categorie}</span>
                    </p>
                  )}
                  {item.magasin && (
                    <p>
                      Boutique :{" "}
                      <span className="font-medium text-gray-700">{item.magasin}</span>
                    </p>
                  )}
                </div>

                {/* PRIX + BADGE */}
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold" style={{ color: "#2D8A47" }}>
                    {item.prix.toLocaleString()} Ar
                    {item.isLocation && item.typePrix && (
                      <span style={{ fontSize: "12px", marginLeft: "4px", color: "#14532d" }}>
                        / {formatTypePrix(item.typePrix)}
                      </span>
                    )}
                  </span>

                  <span
                    className="text-[10px] font-medium"
                    style={{ color: item.isLocation ? "#2563eb" : "#7c3aed" }}
                  >
                    {item.isLocation ? "Location" : "Vente"}
                  </span>
                </div>

                {/* BOUTON AJOUTER (chaleureux, comme avant) */}
                <Button
                  size="sm"
                  className="w-full"
                  style={{
                    background: "linear-gradient(to right, #ec4899, #db2777)",
                    color: "white",
                    borderRadius: "8px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleAddFavToCart(item.id, 1, item.isLocation);
                  }}
                >
                 {addingFavIds.has(item.id) ? (
                    <span className="animate-pulse">Ajout...</span>
                  ) : addedFavIds.has(item.id) ? (
                    <>✅ Ajouté</>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4 mr-1" />
                      Ajouter
                    </>
                  )}
                </Button>
              </div>
            ))}
            
          </div>
        )}
      </CardContent>
    </Card>
    {/* ✅ MODAL EN DEHORS */}
    {isFavModalOpen && favSelectedProduct && (
      <ProductDetailModal
        product={favSelectedProduct}
        onClose={closeFavModal}
        onAddToCart={async (id, qty) => {
          await handleAddFavToCart(id, qty, favSelectedProduct?.isLocation);
          closeFavModal(); // optionnel mais pratique
        }}
      />
    )}
  </>
  );

  // const renderWallet = () => (
  //   <>
  //     <div className="grid lg:grid-cols-2 gap-6">
  //       {/* Solde */}
  //       <Card className="border-l-4 border-l-[#2D8A47] shadow-md">
  //         <CardHeader className="bg-green-50 to-white">
  //           <CardTitle className="flex items-center text-[#2D8A47]">
  //             <CreditCard className="h-5 w-5 mr-2" /> Wallet Tsena
  //           </CardTitle>
  //         </CardHeader>

  //         <CardContent className="text-center">
  //           <div className="text-3xl font-bold text-[#2D8A47] mb-2">
  //             {walletBalance.toLocaleString()} Ar
  //           </div>

  //           <p className="text-gray-600 mb-6">Solde disponible</p>

  //           <div className="grid gap-3">
  //             <Button
  //               className="bg-[#2D8A47] text-white"
  //               onClick={() => setIsRechargeModalOpen(true)}
  //             >
  //               Recharger le wallet
  //             </Button>

  //             <Button
  //               variant="outline"
  //               className="border-[#2D8A47] text-[#2D8A47]"
  //               onClick={() =>
  //                 toast.info("Fonctionnalité bientôt disponible.")
  //               }
  //             >
  //               Transférer des fonds
  //             </Button>
  //           </div>
  //         </CardContent>
  //       </Card>

  //       {/* Paiements mobiles */}
  //       <Card className="border-l-4 border-l-blue-500 shadow-md">
  //         <CardHeader className="bg-blue-50 to-white">
  //           <CardTitle className="flex items-center text-blue-600">
  //             💳 Paiements mobiles
  //           </CardTitle>
  //         </CardHeader>

  //         <CardContent className="space-y-4">
  //           {/* MVola */}
  //           <div className="flex justify-between p-3 bg-red-50 border rounded-lg">
  //             <div className="flex items-center space-x-3">
  //               <div className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center font-bold">
  //                 M
  //               </div>
  //               <div>
  //                 <p className="font-medium">MVola</p>
  //                 <p className="text-sm text-gray-600">Connecté</p>
  //               </div>
  //             </div>
  //             <Badge className="bg-green-100 text-green-700">Actif</Badge>
  //           </div>

  //           {/* OM */}
  //           <div className="flex justify-between p-3 bg-orange-50 border rounded-lg">
  //             <div className="flex items-center space-x-3">
  //               <div className="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center font-bold">
  //                 O
  //               </div>
  //               <div>
  //                 <p className="font-medium">Orange Money</p>
  //                 <p className="text-sm text-gray-600">Non connecté</p>
  //               </div>
  //             </div>
  //             <Button size="sm" variant="outline" className="border-orange-300 text-orange-600">
  //               Connecter
  //             </Button>
  //           </div>

  //           {/* Airtel */}
  //           <div className="flex justify-between p-3 bg-red-50 border rounded-lg opacity-70">
  //             <div className="flex items-center space-x-3">
  //               <div className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center font-bold">
  //                 A
  //               </div>
  //               <div>
  //                 <p className="font-medium">Airtel Money</p>
  //                 <p className="text-sm text-gray-600">Non connecté</p>
  //               </div>
  //             </div>
  //             <Button size="sm" variant="outline" className="border-red-300 text-red-600">
  //               Connecter
  //             </Button>
  //           </div>
  //         </CardContent>
  //       </Card>
  //     </div>

  //     {/* Historique */}
  //     <Card
  //       className="mt-8"
  //       style={{
  //         borderLeft: "4px solid #6b7280", 
  //       }}
  //     >
  //       <CardHeader
  //         style={{
  //           backgroundColor: "#f3f4f6",  
  //           borderBottom: "1px solid #e5e7eb", 
  //         }}
  //       >
  //         <CardTitle
  //           className="flex items-center"
  //           style={{ color: "#374151" }} 
  //         >
  //           <Clock className="h-5 w-5 mr-2" style={{ color: "#374151" }} />
  //           Historique des transactions
  //         </CardTitle>
  //       </CardHeader>
  //       <CardContent>
  //         <div className="space-y-3">
  //           {transactions.map((t) => (
  //             <div key={t.id} className="flex justify-between p-3 border rounded-lg">
  //               <div className="flex items-center space-x-3">
  //                 <div
  //                   className={`w-8 h-8 rounded-full flex items-center justify-center ${
  //                     t.type === "recharge"
  //                       ? "bg-green-100 text-green-700"
  //                       : "bg-red-100 text-red-700"
  //                   }`}
  //                 >
  //                   {t.type === "recharge" ? "+" : "-"}
  //                 </div>

  //                 <div>
  //                   <p className="font-medium text-sm">{t.description}</p>
  //                   <p className="text-xs text-gray-500">
  //                     {new Date(t.date).toLocaleDateString("fr-FR")} ·{" "}
  //                     {new Date(t.date).toLocaleTimeString("fr-FR", {
  //                       hour: "2-digit",
  //                       minute: "2-digit",
  //                     })}
  //                   </p>
  //                 </div>
  //               </div>

  //               <p
  //                 className={`font-medium ${
  //                   t.type === "recharge" ? "text-green-600" : "text-red-600"
  //                 }`}
  //               >
  //                 {t.type === "recharge" ? "+" : ""}
  //                 {t.amount.toLocaleString()} Ar
  //               </p>
  //             </div>
  //           ))}
  //         </div>
  //       </CardContent>
  //     </Card>
  //   </>
  // );

  const renderProfile = () => {
  return (
    <Card className="border-l-4 border-l-purple-500 shadow-md">
      {/* HEADER */}
      <CardHeader className="bg-purple-50">
        <CardTitle className="flex items-center text-purple-600">
          <User className="h-5 w-5 mr-2" /> Mon profil
        </CardTitle>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-0">
        {/* AVATAR */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl px-4 py-2 mb-6 text-white shadow-lg">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
              <AvatarFallback className="bg-white text-purple-600 text-3xl font-bold">
                {profileUser?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h2 className="text-2xl font-bold mb-1">{profileUser?.name}</h2>
              <p className="text-purple-100 mb-2">{profileUser?.email}</p>
              <Badge className="bg-white bg-opacity-20 text-white border-0">
                {isVendor ? "Vendeur" : "Client"}
              </Badge>
            </div>
          </div>
        </div>

        {/* 2 COLONNES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* INFORMATIONS PERSONNELLES - BARRE BLEUE */}
          <div className="rounded-lg p-4 bg-white"
            style={{ borderLeft: "4px solid #2563eb" }}>
            <h3 className="font-semibold text-blue-700 mb-4 flex items-center gap-2">
              <User className="h-4 w-4" /> Informations personnelles
            </h3>

            <div className="space-y-4">
              
              {/* NOM */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nom complet</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input 
                  value={email}
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>

              {/* TEL */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Téléphone</label>
                <Input 
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="+261 XX XX XXX XX"
                />
              </div>

              {/* ADRESSE */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Adresse</label>
                <Input 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Votre adresse"
                />
              </div>

              {/* MAGASIN */}
              {isVendor && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nom du magasin</label>
                  <Input 
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Nom de la boutique"
                  />
                </div>
              )}

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2 py-2.5">
                Enregistrer
              </Button>
            </div>
          </div>

          {/* SÉCURITÉ - BARRE VERTE */}
          <div className="rounded-lg p-4 bg-white"
            style={{ borderLeft: "4px solid #2D8A47" }}>
            <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Sécurité
            </h3>

            <div className="space-y-4">
              
              {/* ANCIEN MDP */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Ancien mot de passe</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {/* NOUVEAU MDP */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5">
                Effectuer
              </Button>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

  return (
    <div className="px-6 py-4">

      {/* Main content */}
      <div className="p-6 w-full max-w-[1550px] mx-auto">
        <Tabs value={activeTab} onValueChange={(val) => onChangeTab(val as ClientTab)} className="space-y-6">
          <TabsContent value="client-dashboard">{renderDashboard()}</TabsContent>
          <TabsContent value="client-orders">{renderOrders()}</TabsContent>
          <TabsContent value="client-wishlist">{renderWishlist()}</TabsContent>
          {/* <TabsContent value="client-wallet">{renderWallet()}</TabsContent> */}
          <TabsContent value="client-profile">{renderProfile()}</TabsContent>
        </Tabs>
      </div>

      {/* <RechargeWalletModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
        onRechargeSuccess={(amount, method) => {
          setWalletBalance(walletBalance + amount);
          setTransactions((t) => [
            {
              id: crypto.randomUUID(),
              type: "recharge",
              description: `Recharge ${method}`,
              amount,
              date: new Date().toISOString(),
            },
            ...t,
          ]);
        }}
        currentBalance={walletBalance}
      /> */}
    </div>
  );
}
