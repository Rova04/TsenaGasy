import React, { useState, useEffect } from 'react';
import { Users, Package, Star, BarChart3, X, Settings, LogOut, Plus, Search, Edit, Trash2, Eye, CheckCircle, XCircle, TrendingUp, ClipboardList } from 'lucide-react';
import AddUserModal from '../components/addUserModal';
import { UserData } from '../config/authStorage';
import { API_BASE_URL } from '../config/api';
import { StatusBadge } from "../components/StatusBadge";
import { ViewProductModal } from "../components/viewProductModal";
import axios from 'axios';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import '../styles/AdminDashboard.css';

type TabType = 'overview' | 'accounts' | 'products' | 'sponsors' | 'orders';

type AdminDashboardProps = {
  currentUser: UserData;
  onLogout: () => void;
};

export default function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'en_attente' | 'refuse'>('en_attente');
  const [adhesionRequests, setAdhesionRequests] = useState<any[]>([]);
  const [showRejected, setShowRejected] = useState(false);
  const [productFilter, setProductFilter] = useState<'en_attente' | 'validé' | 'refusé'>('en_attente');
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductViewModalOpen, setIsProductViewModalOpen] = useState(false);
  const [filteredAdminProducts, setFilteredAdminProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string, nom: string }[]>([]);
  const [sponsorFilter, setSponsorFilter] = useState<"en_attente" | "validé" | "refusé">("en_attente");
  const [sponsorsAdmin, setSponsorsAdmin] = useState<any[]>([]);
  const [filteredSponsors, setFilteredSponsors] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProducts: 0,
    totalSponsors: 0
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [orderViewMode, setOrderViewMode] = useState<"current" | "history">("current");

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/getCategories`);
        setCategories(res.data);
      } catch (err) {
        console.error("Erreur récupération catégories (admin) :", err);
      }
    };

    fetchCategories();
  }, []);
  
  useEffect(() => {
    fetchStats();
    fetchAdhesionRequests();
    fetchAccounts();
    fetchAdminProducts();
    fetchAdminSponsors();
    fetchAdminOrders();
    const savedTab = sessionStorage.getItem('activeTab') as TabType | null;
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    setFilteredAdminProducts(
      adminProducts.filter((p) => p.statut === productFilter)
    );
  }, [productFilter, adminProducts]);
  
  useEffect(() => {
    setFilteredSponsors(
      sponsorsAdmin.filter((s: any) => s.statut === sponsorFilter)
    );
  }, [sponsorFilter, sponsorsAdmin]);
  
  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  
  //afficher les commandes
  const fetchAdminOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/orders`);
      setOrders(res.data || []);
    } catch (e) {
      console.error("Erreur fetch orders admin", e);
    }
  };
  
  //récupérer les demande d'adhésion des magasins
  const fetchAdhesionRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/getAdhesion/vendor`);
      setAdhesionRequests(res.data.demandes);
    } catch (error) {
      console.error("Erreur récupération demandes :", error);
    }
  };

  //suppression directe du magasin dans la table magasin
  const handleDeleteRejected = async (idMagasin: string, nomMagasin: string) => {
    await Swal.fire({
      title: `Confirmation de suppression`,
      text: `Souhaitez-vous supprimer dénitivement le magasin "${nomMagasin}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/deleteAdhesion/${idMagasin}`);
          await fetchAdhesionRequests(); // mise à jour du tableau
          return true;
        } catch (error) {
          console.error("Erreur suppression :", error);
          Swal.showValidationMessage(`Erreur lors de la suppression`);
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        toast.success("Magasin supprimé avec succès !");
      }
    });
  };

  //afficher tous les comptes
  const fetchAccounts = async () => {
  try {
    const adminId = currentUser.id;
    const res = await axios.get(`${API_BASE_URL}/getAllUser/${adminId}`);

    const users = res.data.users.map((u: any) => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const lastLoginDate = u.lastLogin ? new Date(u.lastLogin) : null;
      const referenceDate = lastLoginDate ?? new Date(u.createdAt);
      const activityStatus = referenceDate < threeMonthsAgo ? "inactif" : "actif";

      return {
        id: u.id,
        name: u.nom,
        email: u.email,
        role: u.role,

        // ✅ Seuls les vendeurs ont un statut de magasin (badge)
        statut:
          u.role === "vendor"
            ? u.magasinStatus || "en_attente"
            : null, // ou undefined

        activityStatus,
        joinDate: new Date(u.createdAt).toLocaleDateString("fr-FR"),
        lastLogin: lastLoginDate ? lastLoginDate.toLocaleDateString("fr-FR") : null,
      };
    });

    setAccounts(users);
  } catch (error) {
    console.error(error);
  }
};

  //décision sur magasin
  const handleAdhesionDecision = async (idMagasin: string, decision: 'approuve' | 'refuse') => {
    try {
      Swal.fire({
        title: "Traitement...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.put(`${API_BASE_URL}/adhesionDecision/${idMagasin}`, { 
        statut: decision 
      });

      await fetchAdhesionRequests();
      Swal.close();
      toast.success(`Vendeur ${decision} avec succès !`);
      
      console.log(`Demande ${decision === 'approuve' ? 'approuvée' : 'refusée'} avec succès`);
    } catch (error) {
      console.error(`Erreur lors de la ${decision === 'approuve' ? 'approbation' : 'refus'} :`, error);
      // Gérer l'erreur (afficher un message à l'utilisateur par exemple)
    }
  };

  //gestion de compte global
  const handleAccept = async (id: number) => {
    // exemple logique backend
    await axios.put(`${API_BASE_URL}/users/${id}/activate`);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a));
  };

  //gestion de compte global
  const handleReject = async (id: string) => {
    await Swal.fire({
      title: "Supprimer ce compte ?",
      text: "Cette action est définitive.",
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
          await axios.delete(`${API_BASE_URL}/admin/users/${id}`);
        } catch (error: any) {
          if (axios.isAxiosError(error) && error.response) {
            // message backend affiché dans le modal
            Swal.showValidationMessage(
              error.response.data?.message ||
                "Erreur lors de la suppression de l'utilisateur."
            );
          } else {
            Swal.showValidationMessage(
              "Erreur inattendue lors de la suppression."
            );
          }
          throw error; // pour empêcher la fermeture automatique
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        toast.success("Utilisateur supprimé avec succès.");
        // 🔄 on recharge proprement la liste
        fetchAccounts();
      }
    });
  };
  
  //gestion de compte global
  const handleRoleChange = async (id: string, role: string) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/user/${id}`, { role });

      // Mise à jour locale immédiate
      setAccounts(prev =>
        prev.map(a => (a.id === id ? { ...a, role } : a))
      );

      // Si le backend a créé un magasin → recharger la liste
      await fetchAccounts();

      toast.success(
        role === "vendor"
          ? "L'utilisateur est maintenant vendeur. Magasin créé automatiquement 🎉"
          : "Rôle mis à jour avec succès."
      );

    } catch (error) {
      console.error("Erreur mise à jour rôle:", error);
      toast.error("Erreur lors de la mise à jour du rôle.");
    }
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('activeTab'); //supprime le tab actif sauvegardé
    onLogout(); 
  };
  
  //récupérer les produits pour gestion
  const fetchAdminProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/products`);
      const data = res.data || [];

      const formatted = data.map((p: any) => ({
        ...p,
        nom: p.nom || p.name,
        prix: Number(p.prix || p.price),
        image: p.images?.[0] || "/placeholder.png",
        status: p.statut,
        proprietaireEmail: p.proprietaireEmail,
        magasin: p.magasin,
        typeProduit: p.typeProduit
      }));
      setAdminProducts(formatted);

    } catch (error) {
      console.error("Erreur chargement produits admin:", error);
    }
  };

  // update de statut pour produit
  const updateProductStatus = async (productId: string, newStatus: "validé" | "refusé") => {
    try {
      Swal.fire({
        title: "Traitement...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.put(`${API_BASE_URL}/admin/products/decision/${productId}`, {
        statut: newStatus
      });

      Swal.close(); 
      toast.success(`Produit ${newStatus} avec succès !`);
      fetchAdminProducts();
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour du statut.");
    }
  };

  // suppression de produit
  const deleteProduct = async (productId: string, productName: string) => {
    await Swal.fire({
      title: "Supprimer le produit ?",
      text: `Voulez-vous supprimer définitivement "${productName}" ?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/admin/delete/${productId}`);
          return true;
        } catch (error) {
          Swal.showValidationMessage("Erreur lors de la suppression.");
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        toast.success("Produit supprimé !");
        fetchAdminProducts();
        fetchStats();
      }
    });
  };

  // récupérer les sponsors pour gestion
  const fetchAdminSponsors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/sponsors`);
      const data = res.data || [];

      const formatted = data.map((s: any) => {
        const p = s.produit || {};

        return {
          ...s,

          // 🔥 Remapper exactement comme adminProducts
          produit: {
            id: p.id,
            nom: p.nom,
            price: p.prix,
            stock: p.stock,
            category: p.categorieId,
            images: p.images,
            tags: p.tags,
            description: p.descriptions,
            weight: p.poids,
            dimensions: p.dimensions,
            materials: p.materiaux,
            status: p.statut,
            typeProduit: p.isLocation ? "location" : "vente",
            sponsorStatus: s.statut,
            locationDetails: p.produitLocation ? {
              caution: p.produitLocation.caution,
              duree_min: p.produitLocation.duree_min,
              disponible: p.produitLocation.disponible,
              typePrix: p.produitLocation.typePrix,
              lieuRecup: p.produitLocation.lieuRecup
            } : null
          },

          // 🔹 Pour le tableau
          produitNom: p.nom,
          image: p.images?.[0] || "/placeholder.png",
          prix: Number(p.prix),
          magasin: p.magasin?.nom_Magasin,
          proprietaireEmail: p.magasin?.proprietaire?.email,
        };
      });

      setSponsorsAdmin(formatted);
      fetchStats();
      setFilteredSponsors(
        formatted.filter((s: any) => s.statut === sponsorFilter)
      );
    } catch (error) {
      console.error("Erreur chargement sponsors admin:", error);
    }
  };
  
  // update de status pour sponsor
  const updateSponsorStatus = async (id: string, statut: "validé" | "refusé") => {
    try {
      Swal.fire({ title: "Traitement...", didOpen: () => Swal.showLoading() });

      await axios.put(`${API_BASE_URL}/admin/sponsors/${id}`, { statut });

      Swal.close();
      toast.success(`Sponsor ${statut} !`);

      fetchAdminSponsors();
      fetchStats();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  // suppression sponsor
  const deleteSponsor = async (id: string, produitNom: string) => {
    await Swal.fire({
      title: "Supprimer le sponsor ?",
      text: `Voulez-vous supprimer définitivement le sponsor du produit "${produitNom || "ce produit"}" ?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/admin/delete/sponsors/${id}`);
          return true;
        } catch (error) {
          Swal.showValidationMessage("Erreur lors de la suppression.");
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        toast.success("Sponsor supprimé !");
        fetchAdminSponsors();
        fetchStats();
      }
    });
  };

  const handleShipOrder = async (venteId: string, factureNumero?: string) => {
    const confirm = await Swal.fire({
      title: "Expédier la commande ?",
      text: `Confirmer l'expédition de la facture #${factureNumero || "—"} ?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, expédier",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#8B5CF6",
      cancelButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: "Expédition en cours...",
      text: "Veuillez patienter",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const res = await axios.put(`${API_BASE_URL}/orders/${venteId}/ship`);

      // si jamais ton API renvoie { ok:false }
      if (res.data?.ok === false) {
        Swal.close();
        toast.warning(res.data.message || "Impossible d'expédier.");
        return;
      }
      Swal.close();
      toast.success("Commande expédiée");

      // refresh liste
      fetchAdminOrders();
    } catch (e: any) {
      console.error(e);

      Swal.close();
      toast.error(e?.response?.data?.error || "Erreur expédition");
    }
  };

  // pour statistiques du dashboard
  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/stats`);
      setStats(res.data);
    } catch (error) {
      console.error("Erreur chargement stats :", error);
    }
  };

  const hasPendingAdhesions = adhesionRequests.some(r => r.statut === "en_attente");
  const hasPendingProducts = adminProducts.some(p => p.statut === "en_attente");

  const logisticsCount = orders.filter(
    (o) => o.statut !== "expedie" && o.statut !== "expédié"
  ).length;

  //suppression facture
  const handleAdminDeleteOrder = async (orderId: string, factureNumero?: string | null) => {
    await Swal.fire({
      title: "Supprimer définitivement ?",
      text: factureNumero
        ? `Supprimer la commande liée à la facture "${factureNumero}" ?`
        : "Supprimer définitivement cette commande ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/orders/${orderId}`);
          return true;
        } catch (err: any) {
          Swal.showValidationMessage(
            err?.response?.data?.error || "Erreur lors de la suppression."
          );
          return false;
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        toast.success("Commande supprimée !");
        fetchAdminOrders(); 
      }
    });
  };

  // download facture
  const downloadFacture = async (url?: string | null, factureNumero?: string | null) => {
    if (!url) {
      toast.error("Facture indisponible.");
      return;
    }

    try {
      const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

      const isAbsolute = /^https?:\/\//i.test(url);
      const clean = url.replace(/^\/+/, "");
      const fullUrl = isAbsolute ? url : `${SERVER_BASE_URL}/${clean}`;

      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error("Fetch PDF failed");

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
  
  const renderContent = () => {
    
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
              {/* Statistiques principales */}
            
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Utilisateurs */}
                <div
                  className="rounded-xl p-6 shadow-md cursor-pointer text-white"
                  style={{ backgroundColor: "#3B82F6" }} onClick={() => setActiveTab("accounts")}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm opacity-90">Utilisateurs totaux</p>
                      <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <Users size={24} color="#3B82F6" />
                    </div>
                  </div>
                </div>
              
                {/* Logistique en cours */}
                <div
                  className="rounded-xl p-6 shadow-md cursor-pointer text-white"
                  style={{ backgroundColor: "#8B5CF6" }} onClick={() => setActiveTab("orders")}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm opacity-90">Logistique en cours</p>
                      <p className="text-3xl font-bold mt-2">{logisticsCount}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <Users size={24} color="#8B5CF6" />
                    </div>
                  </div>
                </div>

                {/* Produits */}
                <div
                  className="rounded-xl p-6 shadow-md cursor-pointer text-white"
                  style={{ backgroundColor: "#F59E0B" }} onClick={() => setActiveTab("products")}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm opacity-90">Produits validés</p>
                      <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <Package size={24} color="#F59E0B" />
                    </div>
                  </div>
                </div>

                {/* Sponsors */}
                <div
                  className="rounded-xl p-6 shadow-md cursor-pointer text-white"
                  style={{ backgroundColor: "#FBBF24" }} onClick={() => setActiveTab("sponsors")}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm opacity-90">Sponsors en cours</p>
                      <p className="text-3xl font-bold mt-2">{stats.totalSponsors}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <Star size={24} color="#FBBF24" />
                    </div>
                  </div>
                </div>    
            </div>

            {/* Activité récente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demandes d’adhésion récentes */}
              <div className={`bg-white rounded-lg p-6 transition-all ${
                hasPendingAdhesions ? "border-l-4 border-yellow-400 shadow-md" : "border border-gray-200"
              }`}>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Nouvelles demandes d’adhésion</h3>

                <div className="space-y-3">
                  {adhesionRequests
                    .filter((r) => r.statut === "en_attente")
                    .slice(0, 4)
                    .map((req) => (
                      <div key={req.idMagasin} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        onClick={() => {
                          setActiveTab("accounts");
                          setFilterStatus("en_attente");
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="text-blue-500" size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{req.nomMagasin}</p>
                            <p className="text-sm text-gray-500">{req.proprietaire.email}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-600">
                          En attente
                        </span>
                      </div>
                    ))}

                  {adhesionRequests.filter(r => r.statut === "en_attente").length === 0 && (
                    <p className="text-sm text-gray-500 text-center">Aucune demande en attente.</p>
                  )}
                </div>
              </div>

              {/* Produits en attente récents */}
              <div className={`bg-white rounded-lg p-6 transition-all ${
                hasPendingProducts ? "border-l-4 border-orange-400 shadow-md" : "border border-gray-200"
              }`}>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Produits en attente de validation</h3>

                <div className="space-y-3">
                  {adminProducts
                    .filter((p) => p.statut === "en_attente")
                    .slice(0, 4)
                    .map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      onClick={() => {
                        setActiveTab("products");
                        setProductFilter("en_attente");
                      }}>
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image}
                            className="w-10 h-10 rounded object-cover border"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{product.nom}</p>
                            <p className="text-sm text-gray-500">{product.prix} Ar</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                          En attente
                        </span>
                      </div>
                    ))}

                  {adminProducts.filter(p => p.statut === "en_attente").length === 0 && (
                    <p className="text-sm text-gray-500 text-center">Aucun produit en attente.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div className="space-y-6">
            {/* SECTION 1 : DEMANDES  */}
            <div className="section-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold mb-4">Demandes d'adhésion des vendeurs</h3>

                <div className="mb-4 flex justify-end gap-2">
                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${filterStatus === 'en_attente' ? 'bg-[#FFA726] text-white hover:bg-[#FFB74D]' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setFilterStatus('en_attente')}
                  >
                    En attente
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${filterStatus === 'refuse' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setFilterStatus('refuse')}
                  >
                    Refusées
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Magasin</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Type</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Propriétaire</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Rôle</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Adresse</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Contact</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const filtered = adhesionRequests.filter(r =>
                        filterStatus === 'en_attente'
                          ? r.statut === 'en_attente'
                          : r.statut === 'refuse'
                      );

                      if (filtered.length === 0) {
                        return (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="text-center py-3 text-gray-600 text-sm">
                              {filterStatus === 'en_attente'
                                ? "Aucune demande d'adhésion en attente."
                                : "Aucune demande refusée."}
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(request => (
                        <tr key={request.idMagasin} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{request.nomMagasin}</td>
                          <td className="px-4 py-2">{request.type}</td>
                          <td className="px-4 py-2">{request.proprietaire.nom}</td>
                          <td className="px-4 py-2">{request.proprietaire.email}</td>
                          <td className="px-4 py-2">{request.proprietaire.role}</td>
                          <td className="px-4 py-2">{request.proprietaire.adresse}</td>
                          <td className="px-4 py-2">{request.proprietaire.tel}</td>
                          <td className="px-4 py-2 text-center">
                            {filterStatus === 'en_attente' ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleAdhesionDecision(request.idMagasin, 'approuve')}
                                  className="bg-[#2D8A47] text-white px-3 py-1 rounded hover:bg-[#245A35] text-sm"
                                >
                                  Accepter
                                </button>
                                <button
                                  onClick={() => handleAdhesionDecision(request.idMagasin, 'refuse')}
                                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                                >
                                  Refuser
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleAdhesionDecision(request.idMagasin, 'approuve')}
                                  className="bg-[#2D8A47] text-white px-3 py-1 rounded hover:bg-[#245A35] text-sm"
                                >
                                  Réapprouver
                                </button>
                                <button
                                  onClick={() => handleDeleteRejected(request.idMagasin, request.nomMagasin)}
                                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                                >
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* SECTION 2 : GESTION GÉNÉRALE  */}
            <div className="section-card">
              <h3 className="text-xl font-bold mb-4">Gestion des comptes</h3>
              <div className="mb-4 flex items-center gap-3">
                {/* Barre de recherche */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16}  />
                  <input
                    type="text"
                    placeholder="Rechercher un compte..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8A47]"
                  />
                </div>
                <button
                  className="bg-[#2D8A47] text-white px-4 py-2 rounded-lg hover:bg-[#245A35] flex items-center gap-2"
                  onClick={() => setIsAddUserModalOpen(true)}
                >
                  <Plus size={18} /> Ajouter un compte
                </button>
              </div>

              {/* Tableau général */}
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rôle</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Activité</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date d'inscription</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {accounts
                      .filter(account =>
                        (account?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                        (account?.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                      )
                      .map(account => (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{account.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{account.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                            <select
                              value={account.role}
                              onChange={(e) => handleRoleChange(account.id, e.target.value)}
                              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8A47]"
                            >
                              <option value="client">Client</option>
                              <option value="vendor">Vendeur</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {account.role === "vendor" && account.statut ? (
                              <StatusBadge status={account.statut} />
                            ) : (
                              <span style={{
                                fontSize: "20px",      
                                fontWeight: 600,       
                                display: "inline-block",
                                lineHeight: 1,
                              }}>-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={account.activityStatus} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{account.joinDate}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {account.status === 'pending' && (
                                <button
                                  onClick={() => handleAccept(account.id)}
                                  className="bg-[#2D8A47] text-white px-3 py-1 rounded hover:bg-[#245A35] transition-colors text-sm"
                                >
                                  Accepter
                                </button>
                              )}
                              <button
                                onClick={() => handleReject(account.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Modal d’ajout utilisateur */}
              {isAddUserModalOpen && (
                <AddUserModal
                  isOpen={isAddUserModalOpen}
                  onClose={() => setIsAddUserModalOpen(false)}
                  role="client"
                  onUserAdded={(newUser) => {
                    // Ajouter le nouvel utilisateur à la liste existante
                    setAccounts(prev => [newUser, ...prev]);
                  }}
                />
              )}
            </div>
          </div>    
        );

      case "products":
        return (
          <div className="space-y-6">

            {/* SECTION : TITRE + FILTRES */}
            <div className="section-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold mb-4">Gestion des produits</h3>

                <div className="mb-4 flex justify-end gap-2">
                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      productFilter === "en_attente"
                        ? "bg-[#FFA726] text-white hover:bg-[#FFB74D]"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setProductFilter("en_attente")}
                  >
                    En attente
                  </button>

                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      productFilter === "validé"
                        ? "bg-[#2D8A47] text-white hover:bg-[#245A35]"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setProductFilter("validé")}
                  >
                    Validés
                  </button>

                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      productFilter === "refusé"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setProductFilter("refusé")}
                  >
                    Refusés
                  </button>
                </div>
              </div>

              {/* TABLEAU IDENTIQUE À GESTION D’ADHÉSION */}
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Produit</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Propriétaire</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Magasin</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Type</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Prix</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Statut</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {filteredAdminProducts.length === 0 ? (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="text-center py-3 text-gray-600 text-sm">
                          Aucun produit trouvé.
                        </td>
                      </tr>
                    ) : (
                      filteredAdminProducts.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.image}
                                className="w-12 h-12 rounded object-cover border"
                              />
                              <span className="font-medium">{p.nom}</span>
                            </div>
                          </td>

                          <td className="px-4 py-2">{p.proprietaireEmail}</td>
                          <td className="px-4 py-2">{p.magasin}</td>
                          <td className="px-4 py-2 capitalize"><StatusBadge status={p.typeProduit}/></td>
                          <td className="px-4 py-2 font-medium">{p.prix} Ar</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={p.statut} />
                          </td>

                          <td className="px-4 py-2 text-center">
                            <div className="flex justify-center gap-2">

                              {/* VIEW */}
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setIsProductViewModalOpen(true);
                                }}
                                className="p-2 rounded bg-gray-100 hover:bg-gray-200"
                              >
                                <Eye size={16} />
                              </button>

                              {/* --- STATUT : EN ATTENTE --- */}
                              {p.statut === "en_attente" && (
                                <>
                                  {/* Valider */}
                                  <button
                                    onClick={() => updateProductStatus(p.id, "validé")}
                                    className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    <CheckCircle size={16} />
                                  </button>

                                  {/* Refuser */}
                                  <button
                                    onClick={() => updateProductStatus(p.id, "refusé")}
                                    className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}

                              {/* --- STATUT : VALIDÉ --- */}
                              {p.statut === "validé" && (
                                <>                                  
                                  {/* Refuser */}
                                  <button
                                    onClick={() => updateProductStatus(p.id, "refusé")}
                                    className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    <XCircle size={16} />
                                  </button>

                                  {/* supprimer */}
                                  <button
                                    onClick={() => deleteProduct(p.id, p.nom)}
                                    className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}

                              {/* --- STATUT : REFUSÉ --- */}
                              {p.statut === "refusé" && (
                                <>
                                  {/* Revalider */}
                                  <button
                                    onClick={() => updateProductStatus(p.id, "validé")}
                                    className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    <CheckCircle size={16} />
                                  </button>

                                  {/* Supprimer */}
                                  <button
                                    onClick={() => deleteProduct(p.id, p.nom)}
                                    className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL DE VISUALISATION */}
            <ViewProductModal
              isOpen={isProductViewModalOpen}
              onClose={() => setIsProductViewModalOpen(false)}
              product={selectedProduct}
              categories={categories}
            />
          </div>
        );

      case "sponsors":
        return (
          <div className="space-y-6">
            <div className="section-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold mb-4">Gestion des sponsors</h3>

                <div className="mb-4 flex justify-end gap-2">
                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      sponsorFilter === "en_attente"
                        ? "bg-[#FFA726] text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setSponsorFilter("en_attente")}
                  >
                    En attente
                  </button>

                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      sponsorFilter === "validé"
                        ? "bg-[#2D8A47] text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setSponsorFilter("validé")}
                  >
                    Validés
                  </button>

                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      sponsorFilter === "refusé"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setSponsorFilter("refusé")}
                  >
                    Refusés
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Produit</th>
                      <th className="px-4 py-2 text-left">Propriétaire</th>
                      <th className="px-4 py-2 text-left">Magasin</th>
                      <th className="px-4 py-2 text-left">Prix</th>
                      <th className="px-4 py-2 text-left">Dates</th>
                      <th className="px-4 py-2 text-left">Statut</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {filteredSponsors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-3 text-gray-600">
                          Aucun sponsor trouvé.
                        </td>
                      </tr>
                    ) : (
                      filteredSponsors.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <img src={s.image} className="w-12 h-12 rounded border" />
                              <span>{s.produitNom}</span>
                            </div>
                          </td>

                          <td className="px-4 py-2">{s.proprietaireEmail}</td>
                          <td className="px-4 py-2">{s.magasin}</td>
                          <td className="px-4 py-2">{s.prix} Ar</td>
                          <td className="px-4 py-2">
                            {s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "—"} →
                            {s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-FR") : "—"}
                          </td>

                          <td className="px-4 py-2">
                            <StatusBadge status={s.statut} />
                          </td>

                          <td className="px-4 py-2 text-center">
                            <div className="flex justify-center gap-2">

                              {/* View */}
                              <button
                                onClick={() => {
                                  setSelectedProduct(s.produit);
                                  setIsProductViewModalOpen(true);
                                }}
                                className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                <Eye size={16} />
                              </button>

                              {s.statut === "en_attente" && (
                                <>
                                  <button
                                    onClick={() => updateSponsorStatus(s.id, "validé")}
                                    className="p-2 bg-green-100 text-green-700 rounded"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => updateSponsorStatus(s.id, "refusé")}
                                    className="p-2 bg-red-100 text-red-700 rounded"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}

                              {s.statut === "validé" && (
                                <>
                                  <button
                                    onClick={() => updateSponsorStatus(s.id, "refusé")}
                                    className="p-2 bg-red-100 text-red-700 rounded"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => deleteSponsor(s.id, s.produitNom)}
                                    className="p-2 bg-red-100 text-red-700 rounded"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}

                              {s.statut === "refusé" && (
                                <>
                                  <button
                                    onClick={() => updateSponsorStatus(s.id, "validé")}
                                    className="p-2 bg-green-100 text-green-700 rounded"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => deleteSponsor(s.id, s.produitNom)}
                                    className="p-2 bg-red-100 text-red-700 rounded"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <ViewProductModal
              isOpen={isProductViewModalOpen}
              onClose={() => setIsProductViewModalOpen(false)}
              product={selectedProduct}
              categories={categories}
            />
          </div>
        );
      
      case "orders": {
        const sortedOrders = [...orders].sort(
          (a, b) => new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime()
        );

        const historyOrders = sortedOrders.filter(
          (o) => o.statut.toLowerCase() === "expedie"
        );

        const currentOrders = sortedOrders.filter(
          (o) => o.statut.toLowerCase() !== "expedie"
        );

        const visibleOrders =
          orderViewMode === "current" ? currentOrders : historyOrders;

        const renderCurrentOrder = (o: any) => {
          const totalLines = o.lignes?.length || 0;
          const okLines = o.lignes?.filter((l: any) => l.depotOk).length || 0;
          const allOk = totalLines > 0 && okLines === totalLines;

          return (
            <div
              key={o.id}
              className="relative bg-white rounded-xl shadow p-4 space-y-3 border-2"
              style={{ borderColor: "#8B5CF6" }}
            >
              {/* HEADER FACTURE */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">
                    Facture #{o.facture_numero || "—"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Commandé le {new Date(o.dateVente).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <StatusBadge status={o.statut} />
              </div>

              {/* CLIENT */}
              <div className="text-sm">
                <p className="font-medium">{o.user.nom} — {o.user.email}</p>
                <p className="text-gray-500">{o.user.tel}</p>
                <p className="text-gray-500">{o.livraison?.adresse_livraison || "—"}</p>
              </div>

              {/* CHECKLIST */}
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                <span>Articles déposés</span>
                <span className={`font-semibold ${allOk ? "text-green-600" : "text-orange-600"}`}>
                  {okLines}/{totalLines}
                </span>
              </div>

              {/* LIGNES */}
              <div className="border-t pt-3 space-y-2">
                <p className="font-semibold text-sm">Articles :</p>

                {o.lignes.map((l: any) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                  >
                    <div>
                      <p className="font-medium">{l.produit.nom}</p>
                      <p className="text-gray-500">
                        Magasin : {l.magasin.nom_Magasin} • Qté : {l.quantite}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        l.depotOk
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {l.depotOk ? "Déposé" : "En attente"}
                    </span>
                  </div>
                ))}
              </div>

              {/* FOOTER : EXPÉDIER */}
              <button
                onClick={() => handleShipOrder(o.id, o.facture_numero)}
                disabled={!allOk}
                className={`w-full py-2 rounded-lg font-medium transition ${
                  allOk ? "cursor-pointer" : "cursor-not-allowed"
                }`}
                style={{
                  backgroundColor: "#8B5CF6",
                  opacity: allOk ? 1 : 0.65,
                  color: "#fff",
                }}
              >
                Expédier
              </button>
            </div>
          );
        };

        const renderHistoryOrder = (o: any) => {
          const dateLivraison = o.livraison?.date_effective
            ? new Date(o.livraison.date_effective).toLocaleDateString("fr-FR")
            : "—";

          return (
            <div
              key={o.id}
              style={{
                border: "2px solid #E5D8FF",
                borderRadius: "12px",
                background: "white",
                padding: "14px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                transition: "0.2s",
              }}
              className="hover:shadow-lg"
            >
              {/* HEADER */}
              <div
                style={{
                  background: "#F3F0FF",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: "#4B3BA8" }}>
                    Facture #{o.facture_numero}
                  </p>
                  <p style={{ fontSize: "12px", color: "#7C7A8A" }}>
                    Commandée le {new Date(o.dateVente).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdminDeleteOrder(o.id, o.facture_numero);
                  }}
                  style={{
                    width: "22px",
                    height: "22px",
                    background: "#FFE5E5",
                    border: "1px solid #FFB3B3",
                    color: "#de2c2cff",
                    borderRadius: "50%",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={12} />
                </button>
              </div>

              {/* INFOS */}
              <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                <p>
                  <strong style={{ color: "#444" }}>Client :</strong> {o.user.nom} —{" "}
                  {o.user.tel}
                </p>

                <p style={{ marginTop: "6px" }}>
                  <strong style={{ color: "#444" }}>Adresse :</strong>
                </p>
                <p
                  style={{
                    whiteSpace: "pre-line",
                    marginTop: "2px",
                    color: "#555",
                    fontSize: "13px",
                  }}
                >
                  {o.livraison?.adresse_livraison}
                </p>

                <p style={{ marginTop: "6px" }}>
                  <strong style={{ color: "#444" }}>Mode :</strong>{" "}
                  {o.livraison?.mode || "—"}
                </p>

                <p style={{ marginTop: "6px" }}>
                  <strong style={{ color: "#444" }}>Livré le :</strong>{" "}
                  {dateLivraison}
                </p>

                <p style={{ marginTop: "6px" }}>
                  <strong style={{ color: "#444" }}>Total :</strong>{" "}
                  <span style={{ fontWeight: 600 }}>
                    {Number(o.total).toLocaleString("fr-FR")} Ar
                  </span>
                </p>
              </div>

              {/* BOUTON PDF */}
              {o.facture_url && (
                <button
                  onClick={() => downloadFacture(o.facture_url, o.facture_numero)}
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    padding: "6px 0",
                    background: "#6B5CF6",
                    color: "white",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Télécharger PDF
                </button>
              )}
            </div>
          );
        };

        // -------------------------------------------------------------
        // 🔥 RENDER FINAL
        // -------------------------------------------------------------
        return (
          <div className="space-y-6">
            <div className="section-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold mb-4">Logistique / Commandes</h3>

                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderViewMode("current")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      orderViewMode === "current"
                        ? "text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    style={
                      orderViewMode === "current" ? { backgroundColor: "#8B5CF6" } : {}
                    }
                  >
                    En cours
                  </button>

                  <button
                    onClick={() => setOrderViewMode("history")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      orderViewMode === "history"
                        ? "text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    style={
                      orderViewMode === "history"
                        ? { backgroundColor: "#6B7280" }
                        : {}
                    }
                  >
                    Historique
                  </button>
                </div>
              </div>

              {/* Si aucune commande */}
              {visibleOrders.length === 0 ? (
                <p className="text-center text-gray-600">Aucune commande.</p>
              ) : (
                <div className="grid gap-6"
                  style={{
                    gridTemplateColumns:
                      orderViewMode === "history"
                        ? "repeat(auto-fill, minmax(280px, 1fr))" // 🔥 3 par ligne automatiquement
                        : "repeat(auto-fill, minmax(350px, 1fr))",
                  }}>
                  {visibleOrders.map((o) =>
                    orderViewMode === "current"
                      ? renderCurrentOrder(o)
                      : renderHistoryOrder(o)
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }


      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar verticale */}
      <aside className="sidebar">
        {/* Header du sidebar */}
        <div className="sidebar-header">
          <h1 className="text-xl font-bold flex items-center gap-2">
            🏛️ Admin Dashboard
          </h1>
          <p className="text-xs text-white text-opacity-75 mt-1">Tsena.mg</p>
        </div>

        {/* Navigation verticale */}
        <nav className="flex-1 py-4">
          <div className="sidebar-nav">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: <BarChart3 size={20} /> },
              { id: 'accounts', label: 'Comptes', icon: <Users size={20} /> },
              { id: 'products', label: 'Produits', icon: <Package size={20} /> },
              { id: 'sponsors', label: 'Sponsors', icon: <Star size={20} /> },
              { id: 'orders', label: 'Logistique', icon: <ClipboardList size={20} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id ? 'active' : ''
                }`}
              >
                <span>{tab.label}</span>
                <div className={`ml-auto ${activeTab === tab.id ? "icon-active" : "icon-inactive"}`}>
                    {tab.icon}
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Bouton déconnexion en bas */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-white hover:bg-[#1F4F25] transition-all"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header supérieur */}
        <header className="header-horizontal">
        <div className="header-content">
          <div className="header-left">
            <h2>
              {activeTab === 'overview' && "Vue d'ensemble"}
              {activeTab === 'accounts' && "Gestion des comptes"}
              {activeTab === 'products' && "Gestion des produits"}
              {activeTab === 'sponsors' && "Gestion des sponsors"}
              {activeTab === 'orders' && "Logistique / Commandes"}
            </h2>
            <p>Plateforme d'administration Tsena.mg</p>
          </div>
          <div className="header-right">
            <p>{formatDate(currentDate)}</p>
            <p>Antananarivo, Madagascar</p>
          </div>
        </div>
      </header>

        {/* Zone de contenu */}
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}