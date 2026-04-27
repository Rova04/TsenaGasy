import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  RefreshCw,
  Boxes,
  Star,
  ShoppingCart,
  DollarSign, 
  Package, 
  Users, 
  TrendingUp,
  Search,
  Filter,
  CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { NewProductModal } from '../components/NewProductModal';
import { ModifyProductModal } from '../components/modifyProductModal';
import { ViewProductModal } from "../components/viewProductModal";
import { NewLocationModal } from '../components/NewLocationModal';
import { StatusBadge } from "../components/StatusBadge";
import "../styles/AdminDashboard.css";
import { toast } from 'sonner';
import { UserData } from '../config/authStorage';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import Swal from 'sweetalert2';

interface VendorDashboardProps {
  currentUser: UserData & { type: "vendor" };
  activeView: string;
  onChangeView: (
    view:
      | "vendor"
      | "vendor-products"
      | "vendor-sponsors"
      | "vendor-orders"
      | "vendor-analytics"
  ) => void;
}

export default function VendorDashboard({ currentUser, activeView, onChangeView }: VendorDashboardProps){
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isModifyProductModalOpen, setModifyProductModalOpen] = useState(false);
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string, nom: string }[]>([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [openSections, setOpenSections] = useState<{ [key: number]: boolean }>({});
  const [isViewProductModalOpen, setIsViewProductModalOpen] = useState(false);
  const [viewedProduct, setViewedProduct] = useState<any>(null);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [filteredSponsors, setFilteredSponsors] = useState<any[]>([]);
  const [selectedSponsorStatus, setSelectedSponsorStatus] = useState("all");
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [popularMode, setPopularMode] = useState<"recent" | "sales">("sales");
  const [instantSearch, setInstantSearch] = useState(false);
  const [autoFilterValid, setAutoFilterValid] = useState(false);
  const [autoFilterSponsor, setAutoFilterSponsor] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeProducts: 0,
    validSponsors: 0
  });
  const [vendorLines, setVendorLines] = useState<any[]>([]);
  const [recentVendorLines, setRecentVendorLines] = useState<any[]>([]);
  const [lineViewMode, setLineViewMode] = useState<"pending" | "delivered">("pending");
  const [deliveredVendorLines, setDeliveredVendorLines] = useState<any[]>([]);

  const currentView =
    activeView === "vendor" ? "overview" :
    activeView === "vendor-products" ? "products" :
    activeView === "vendor-sponsors" ? "sponsor" :
    activeView === "vendor-orders" ? "orders" :
    // activeView === "vendor-analytics" ? "analytics" :
    "overview";

  useEffect(() => {
    if (selectedProduct) {
      setModifyProductModalOpen(true);
    }
  }, [selectedProduct]);
  
  useEffect(() => {
    fetchProducts();
    fetchSponsors();
    fetchStats();
    fetchVendorLines();
    fetchDeliveredVendorLines();
    if (currentUser?.magasinId) {
      fetchPopularProducts();
      fetchRecentVendorLines();
    }
  }, []);
  
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
    if (currentView === "products" && autoFilterValid) {
      const filtered = products.filter(p => p.status === "validé");
      setFilteredProducts(filtered);
      setAutoFilterValid(false); 
    }
  }, [currentView, products, autoFilterValid]);

  useEffect(() => {
    if (currentView === "sponsor" && autoFilterSponsor) {
      const filtered = sponsors.filter(s => s.statut === "validé");
      setFilteredSponsors(filtered);
      setSelectedSponsorStatus("validé");
      setAutoFilterSponsor(false);
    }
  }, [currentView, sponsors, autoFilterSponsor]);

  useEffect(() => {
    if (instantSearch) {
      setDebouncedSearchTerm(searchTerm);
      setInstantSearch(false);
    return;
    }
    
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000); 

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, instantSearch]);

  // lancer la recherche
  useEffect(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (!term) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(p =>
        p.nom.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        (Number(term) === p.price) ||
        (Number(term) === p.stock)
      );
      setFilteredProducts(filtered);
    }
  }, [debouncedSearchTerm, products]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getProductbyMerchand/${currentUser.magasinId}`);

      const produits = response.data.produits || response.data || []; 

      if (produits.length === 0) {
        toast.info("Vous n'avez pas encore ajouté de produit!");
        setProducts([]);
        setFilteredProducts([]);
        return;
      }

    const formatted = produits.map((p: any) => ({
        ...p,
        nom: p.name,
        image: p.images?.[0] || '',
        views: p.views || 0,
        price: Number(p.price),
        status: p.status,
        createdAt: p.createdAt,
        sponsorisé: p.sponsorisé
      })).sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setProducts(formatted);
      setFilteredProducts(formatted);
    } catch (error) {
      console.error('Erreur Axios:', error);
      toast.error('Impossible de récupérer les produits');
    }
  };

  const fetchDeliveredVendorLines = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/vendor/lignes-vente/${currentUser.magasinId}/delivered`);
      setDeliveredVendorLines(res.data || []);
    } catch {
      toast.error("Impossible de charger les articles déposés");
    }
  };
  
  const handleNewProduct = async (newProduct: any) => {
    await fetchProducts();
    setIsNewProductModalOpen(false);
  };
    
  const handleEditProduct = (productId: string) => {
      const product = products.find(p => p.id === productId);
        setSelectedProduct(product);
  };

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    await Swal.fire({
      title: `Confirmation de suppression ?`,
      text: `Souhaitez-vous supprimer le produit "${product.nom}" ?`,
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
          await axios.delete(`${API_BASE_URL}/deleteProduct/${productId}`, {
            data: { imageUrl: product.image }
          });

          // MAJ du tableau
          await fetchProducts();

          return true; // ferme ensuite le Swal
        } catch (error) {
          console.error('Erreur suppression produit:', error);
          Swal.showValidationMessage(`Erreur lors de la suppression`);
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        toast.success(' Produit supprimé avec succès');
      }
    });
  };

  const handleViewProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setViewedProduct(product);
      setIsViewProductModalOpen(true);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mg-MG').format(price) + ' Ar';
  };

  const handleSearchProducts = async (filters: { status?: string, categoryId?: string, isLocation?: boolean, query?: string }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/productbyMerchand/search/${currentUser.id}`,
        filters
      );

      const produits = response.data || [];

      const formatted = produits.map((p: any) => ({
        ...p,
        nom: p.name,
        image: p.images?.[0] || '',
        sales: p.sales || 0,
        price: Number(p.price),
        status: p.status,
        createdAt: p.createdAt,
        typeProduit: p.typeProduit,
        locationDetails: p.locationDetails || null
      }));

      setFilteredProducts(formatted);
    } catch (error) {
      console.error('Erreur recherche produits:', error);
      toast.error('Impossible de rechercher les produits');
    }
    };
  
  const sections = [
    {
      title: "Type",
      type: "typeProduit",
      options: [
        { label: "Vente", value: "vente" },
        { label: "Location", value: "location" }
      ]
    },
    {
      title: "Statut",
      type: "status",
      options: [
      { label: "Tous", value: "all" },
        { label: "Publié", value: "publie" },
        { label: "Brouillon", value: "brouillon" },
        { label: "En attente", value: "en_attente" }
      ]
    },
    {
      title: "Catégorie",
      type: "categoryId",
      options: categories.map(c => ({ label: c.nom, value: c.id }))
    }
  ];

  const handleApplyFilter = async (type: string, value: any) => {
    try {

      if (type === "status" && value === "all") {
        setFilteredProducts(products);
        setShowFilterDropdown(false);
        return;
      }
      
      const filters: any = {};

      if (type === "status") filters.status = value;
      if (type === "categoryId") filters.categoryId = value;
      if (type === "typeProduit") {
        if (value === "location") filters.isLocation = true;
        if (value === "vente") filters.isLocation = false;
      }

      await handleSearchProducts(filters);

      // Ferme le dropdown
      setShowFilterDropdown(false);
    } catch (error) {
      toast.error("Erreur lors de l'application du filtre");
    }
  };

  const handleAddSponsor = async (produitId: string) => {
    try {
      const confirm = await Swal.fire({
        title: "Sponsoriser ce produit ?",
        text: "Ce produit sera mis en avant pendant 1 mois.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Oui, sponsoriser",
        cancelButtonText: "Annuler",
        confirmButtonColor: "#FACC15",
        cancelButtonColor: "#d33",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const response = await axios.post(`${API_BASE_URL}/sponsor/create`, { produitId });

            await fetchProducts();
            await fetchSponsors();

            return response.data;
          } catch (error: any) {
            console.error("Erreur lors du sponsoring :", error);
            const message = error.response?.data?.error || "Erreur lors du sponsoring du produit.";
            Swal.showValidationMessage(message);
            throw error;
          }
        }
      });

      if (confirm.isConfirmed) {
        Swal.close(); // ferme le modal
        toast.success("Produit sponsorisé avec succès !");
      }
    } catch (error) {
      console.error("Erreur globale:", error);
      toast.error("Une erreur est survenue lors du sponsoring.");
    }
  };

  const fetchSponsors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/sponsors/${currentUser.magasinId}`);
      setSponsors(res.data);
      setFilteredSponsors(res.data);
    } catch (error) {
      console.error("Erreur récupération sponsors:", error);
      toast.error("Impossible de charger les sponsors");
    }
  };

  const handleResponsor = async (sponsorId: string) => {
    try {
      const confirm = await Swal.fire({
        title: "Relancer la demande ?",
        text: "Votre demande sera renvoyée aux administrateurs.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Relancer",
        cancelButtonText: "Annuler",
        confirmButtonColor: "#FACC15",
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: false,

        preConfirm: async () => {
          try {
            await axios.put(`${API_BASE_URL}/sponsor/resend/${sponsorId}`);
            
            return true;
          } catch (err: any) {
            Swal.showValidationMessage(
              err?.response?.data?.error || "Impossible de relancer la demande."
            );
            return false;
          }
        }
      });

      if (confirm.isConfirmed) {
        Swal.close();
        await fetchSponsors();
        toast.success("Demande renvoyée avec succès !");
      }

    } catch (err) {
      console.error(err);
      toast.error("Impossible de relancer la demande.");
    }
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    try {
      const confirm = await Swal.fire({
        title: "Supprimer ce sponsoring ?",
        text: "Cette action est définitive.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Supprimer",
        cancelButtonText: "Annuler",
        confirmButtonColor: "#d33",

        /* 🔒 FIGE LE MODAL */
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: false,
        showLoaderOnConfirm: true,

        preConfirm: async () => {
          try {
            await axios.delete(`${API_BASE_URL}/sponsor/delete/${sponsorId}`);

            return true;
          } catch (err: any) {
            Swal.showValidationMessage(
              err?.response?.data?.error || "Erreur lors de la suppression"
            );
            return false;
          }
        }
      });

      if (confirm.isConfirmed) {
        Swal.close();
        toast.success("Sponsor supprimé !");
        fetchSponsors();
      }

    } catch (err) {
      console.error(err);
      toast.error("Impossible de supprimer le sponsor.");
    }
  };
  
  const sponsorFilterOptions = [
    { label: "Tous", value: "all" },
    { label: "En attente", value: "en_attente" },
    { label: "Validé", value: "validé" },
    { label: "Refusé", value: "refusé" }
  ];

  const filterSponsorsByStatus = async (status: string) => {
    setSelectedSponsorStatus(status);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/sponsors/filter/${currentUser.magasinId}`,
        { statut: status }
      );

      setFilteredSponsors(res.data);
    } catch (error) {
      console.error("Erreur filtre sponsors:", error);
      toast.error("Impossible de filtrer.");
    }
  };

  const fetchPopularProducts = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/popular-products/${currentUser.magasinId}`
      );

      const { mode, products } = res.data;

      const formatted = products.map((p: any) => ({
        id: p.id,
        nom: p.nom,
        image: p.images?.[0] || '',
        ventes: p.ventes || 0,
        price: Number(p.prix),
        createdAt: p.createdAt,
      }));

      setPopularMode(mode);   // "recent" ou "sales"
      setPopularProducts(formatted);

    } catch (err) {
      console.error("Erreur produits populaires:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/vendor/stats/${currentUser.magasinId}`);
      setStats(res.data);

    } catch (err) {
      console.error("Erreur stats :", err);
      toast.error("Impossible de charger les statistiques");
    }
  };
  
  //récupérer les ligneVentes
  const fetchVendorLines = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/vendor/lignes-vente/${currentUser.magasinId}/pending`
      );

      setVendorLines(res.data || []);
    } catch (err) {
      console.error("Erreur lignes vendeur:", err);
      toast.error("Impossible de charger les lignes de vente");
    }
  };
  
  const fetchRecentVendorLines = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/vendor/lignes-vente/${currentUser.magasinId}/recent`
      );

      setRecentVendorLines(res.data || []);
    } catch (err) {
      console.error("Erreur lignes récentes vendeur:", err);
      toast.error("Impossible de charger les dernières commandes");
    }
  };
  
  const handleCheckLine = async (lineId: string) => {
    const confirm = await Swal.fire({
      title: "Confirmer le dépôt ?",
      text: "Le stock sera décrémenté et la ligne disparaîtra de la liste.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, déposer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#2D8A47",
      cancelButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    // 🔒 Modal de chargement qui bloque l'UX
    Swal.fire({
      title: "Traitement en cours...",
      text: "Veuillez patienter",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
    const res = await axios.put(`${API_BASE_URL}/vendor/ligne-vente/${lineId}/check`);

    if (res.data?.ok === false) {
      toast.warning(res.data.message); // ou toast.warning
      Swal.close();
      return;
    }

    setVendorLines(prev => prev.filter(l => l.id !== lineId));
    Swal.close();
    toast.success("Article marqué comme déposé");
    await fetchProducts();

  } catch (err: any) {
    Swal.close();
    const msg = err?.response?.data?.error || "Impossible de valider la ligne.";
    toast.error(msg);
  }
};
  
  const hideLine = async (lineId: string) => {
    const confirm = await Swal.fire({
      title: "Supprimer définitivement ?",
      text: "Cette commande sera définitivement supprimée de votre tableau.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showLoaderOnConfirm: true,

      preConfirm: async () => {
        try {
          await axios.put(`${API_BASE_URL}/vendor/ligne-vente/${lineId}/hide`);
          return true;
        } catch (err: any) {
          Swal.showValidationMessage(
            err?.response?.data?.error || "Une erreur est survenue."
          );
          return false;
        }
      }
    });

    if (!confirm.isConfirmed) return;

    setVendorLines(prev => prev.filter(l => l.id !== lineId));
    setDeliveredVendorLines(prev => prev.filter(l => l.id !== lineId));

    toast.success("Commande supprimée !");
  };

  // contenu de vue d'ensemble
  const renderOverview = () => {
    return (
      <>
        {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="!bg-transparent bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg" onClick={() => { setAutoFilterValid(true); onChangeView("vendor-products") }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-100">Produits actifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3">
                      <Boxes className="h-6 w-6" style={{ color: "#3B82F6" }}/>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{stats.activeProducts}</div>
                      <p className="text-xs text-blue-100 mt-1 opacity-90">
                        Produits actuellement publiés
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

          <Card onClick={() => { setAutoFilterSponsor(true); onChangeView("vendor-sponsors") }}
                style={{
                backgroundColor: "#F7C600",   // jaune solide
                borderRadius: "12px",
                padding: "8px",
                color: "#FFFF"
              }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-yellow-100">Sponsorisé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3">
                      <Star className="h-6 w-6" style={{ color: "#F7C600" }}/>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{stats.validSponsors}</div>
                      <p className="text-xs text-yellow-100 mt-1 opacity-90">
                        Produits mis en avant
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="!bg-transparent bg-gradient-to-br from-[#FFA726] to-[#FF9800] text-white border-0 shadow-lg" onClick={() => onChangeView("vendor-orders")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-orange-100">Commandes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3">
                      <ShoppingCart className="h-6 w-6" style={{ color: "#FF9800" }}/>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{stats.totalOrders}</div>
                      <p className="text-xs text-orange-100 mt-1 opacity-90">
                        Total des commandes reçues
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-l-4 border-l-[#2D8A47] shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-white">
                  <CardTitle className="flex items-center text-[#2D8A47]">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    {popularMode === "recent" ? "Produits récents" : "Produits populaires"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {popularProducts.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">
                        Aucun produit disponible pour le moment.
                      </p>
                    ) : (
                      popularProducts.map((product, index) => (
                        <div key={product.id} onClick={() => {
                                                        onChangeView("vendor-products");
                                                        setInstantSearch(true);
                                                        setSearchTerm(product.nom)
                                                      }}
                          className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                          }`}>
                            {index + 1}
                          </div>

                          <ImageWithFallback
                            src={product.image}
                            alt={product.nom}
                            className="w-12 h-12 object-cover rounded border-2 border-gray-200"
                          />

                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{product.nom}</p>

                            <div className="flex items-center space-x-2">
                              {popularMode === "sales" ? (
                                <span className="text-sm text-[#FFA726] font-medium">
                                  {product.ventes} ventes
                                </span>
                              ) : (
                                <span className="text-sm text-blue-500 font-medium">Produit récent</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-sm text-[#2D8A47]">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-[#FFA726] shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
                  <CardTitle className="flex items-center text-[#FF9800]">
                    <Package className="h-5 w-5 mr-2" />
                    Commandes récentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentVendorLines.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">
                        Aucune commande récente pour le moment.
                      </p>
                    ) : (
                      recentVendorLines.map((line) => (
                        <div
                          key={line.id}
                          onClick={() => {
                            onChangeView("vendor-orders");
                          }}
                          className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div>
                            {/* Id commande (tronqué) */}
                            <p className="font-medium text-sm text-gray-900">
                              {line.vente?.id ? `CMD-${line.vente.id.slice(0, 8)}` : "Commande"}
                            </p>

                            {/* Client */}
                            <p className="text-xs text-gray-600">
                              {line.vente?.user?.nom || "Client inconnu"}
                            </p>

                            {/* Total ligne */}
                            <p className="text-xs text-[#2D8A47] font-bold">
                              {formatPrice(Number(line.total))}
                            </p>

                            {/* Date */}
                            {line.vente?.dateVente && (
                              <p className="text-[11px] text-gray-400">
                                {new Date(line.vente.dateVente).toLocaleDateString("fr-FR")}
                              </p>
                            )}
                          </div>

                          {/* Statut de la vente */}
                          {line.vente?.statut && (
                            <div className="scale-90">
                              <StatusBadge status={line.vente.statut} />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
          </Card>
        </div>
      </>
    );
  };
  
  // contenu de produits
  const renderProducts = () => {
    return (
      <>
        <div className="section-card">   
          {/* header */}             
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Mes produits et services locations</h3>
            <div className="flex items-center gap-3">
              <Button 
                className="bg-[#2D8A47] hover:bg-[#245A35]"
                onClick={() => setIsNewProductModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un produit
              </Button>
              <Button 
                style={{ backgroundColor: "#2563EB", color: "white", transition: "0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1D4ED8")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
                onClick={() => setIsNewLocationModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle location
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
                  
            {/* Bouton Filtres */}
            <div className="relative inline-block">
              <Button
                variant="outline"
                onClick={() => setShowFilterDropdown(prev => !prev)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-1 w-auto max-h-[550px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 whitespace-nowrap" style={{ minWidth: "260px" }}>
                  {sections.map((section, index) => {
                    const isOpen = openSections[index] || false;
                    return (
                      <div key={index} className="border-b border-gray-100">
                        <button
                          onClick={() =>
                            setOpenSections(prev => ({ ...prev, [index]: !prev[index] }))
                          }
                          className="w-full px-3 py-2 flex justify-between items-center text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                          {section.title}
                          <svg
                            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isOpen && (
                          <div className="px-2 pb-2">
                            {section.options.map((opt: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => handleApplyFilter(section.type, opt.value)}
                                className="block w-full text-left px-3 py-1 text-sm rounded
                                            transition-shadow
                                            hover:bg-gray-500 hover:shadow-lg hover:text-gray-900"
                                >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Products Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <Table className="w-full table-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Détails location</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <ImageWithFallback
                            src={product.image}
                            alt={product.nom}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium">{product.nom}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatPrice(product.price)}</TableCell>
                      <TableCell>{<StatusBadge status={product.typeProduit} />}</TableCell>
                      <TableCell>
                        {product.typeProduit === "location" ? (
                          <div className="text-sm leading-tight text-gray-700">
                            <p className="font-medium">{product.locationDetails?.typePrix || "—"}</p>
                            <p className="font-medium">
                              Caution : {formatPrice(product.locationDetails?.caution || 0)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>{product.stock > 0 ? (
                        <span>{product.stock}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                          Rupture
                        </span>
                      )}</TableCell>
                      <TableCell>{<StatusBadge status={product.status} />}</TableCell>
                      <TableCell className="text-center">
                        {product.sponsorisé ? (
                          <div className="flex items-center justify-center w-8 h-8">
                            <span className="text-gray-400 text-lg font-semibold">—</span>
                          </div>
                        ) : product.status !== "validé" ? (
                          <div className="flex items-center justify-center w-8 h-8">
                            <span className="text-gray-400 text-lg font-semibold">—</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddSponsor(product.id)}
                            title="Sponsoriser ce produit"
                            className="flex items-center justify-center w-8 h-8 rounded-full text-black font-bold transition-colors duration-200 shadow-md border border-yellow-400"
                            style={{
                              backgroundColor: '#FACC15',
                              boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#EAB308")}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#FACC15")}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewProduct(product.id)}
                            title="Voir le produit"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditProduct(product.id)}
                            title="Modifier le produit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Supprimer le produit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
        </div>
      </>
    );
  };

  // contenu de sponsors
  const renderSponsor = () => {
    return (
      <>
        <div className="section-card">
          {/* header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Mes produits sponsorisés</h3>
                  
            {/* Bouton Filtres */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Statut :</label>
              <select
                value={selectedSponsorStatus}
                onChange={(e) => filterSponsorsByStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                {sponsorFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>                
            </div>
          </div>
                
          {/* Products Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <Table className="w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSponsors.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <ImageWithFallback
                          src={s.produit.images[0]}
                          alt={s.produit.nom}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium">{s.produit.nom}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(Number(s.produit.prix))}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.statut} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.produit.isLocation ? "location" : "vente"} />
                    </TableCell>
                    <TableCell>
                      {s.dateDebut ? new Date(s.dateDebut).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>
                      {s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center justify-center gap-2"
                        style={{ display: "flex", justifyContent: "center" }}
                      >
                        {/* Voir produit */}
                        <button
                          onClick={() => handleViewProduct(s.produit.id)}
                          title="Voir le produit"
                          style={{
                            backgroundColor: "#2563EB",
                            color: "white",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            display: "flex",
                            alignItems: "center",
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Relancer si refusé */}
                        {s.statut === "refusé" && (
                          <button
                            onClick={() => handleResponsor(s.id)}
                            title="Relancer la demande"
                            style={{
                              backgroundColor: "#FACC15",
                              color: "black",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              display: "flex",
                              alignItems: "center",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}

                        {/* Supprimer si refusé */}
                        {s.statut === "refusé" && (
                          <button
                            onClick={() => handleDeleteSponsor(s.id)}
                            title="Supprimer le sponsoring"
                            style={{
                              backgroundColor: "#DC2626",
                              color: "white",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              display: "flex",
                              alignItems: "center",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </>
    );
  };

  const visibleLines = lineViewMode === "pending" ? vendorLines : deliveredVendorLines;
  // contenu de commandes
 const renderOrders = () => {
  return (
    <div className="section-card">

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Articles commandés</h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLineViewMode("pending")}
            className={`px-3 py-1 rounded-md text-sm font-medium border transition ${
              lineViewMode === "pending"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            En attente
          </button>

          <button
            onClick={() => setLineViewMode("delivered")}
            className={`px-3 py-1 rounded-md text-sm font-medium border transition ${
              lineViewMode === "delivered"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            Déposé
          </button>

        </div>
      </div>

      {/* TABLEAU */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Qté</TableHead>
              <TableHead>PU</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-6">
                  Aucun article répertorié.
                </TableCell>
              </TableRow>
            ) : (
                visibleLines.map((l) => {
                  const isRupture = l.produit.stock < l.quantite;
                  return (
                <TableRow key={l.id}>
                  {/* CLIENT */}
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{l.vente.user.nom}</div>
                      <div className="text-gray-500">{l.vente.user.tel}</div>
                    </div>
                  </TableCell>

                  {/* PRODUIT */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ImageWithFallback
                        src={l.produit.images?.[0]}
                        alt={l.produit.nom}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex flex-col">
                        <span>{l.produit.nom}</span>

                        <span
                          className={`text-xs ${
                            isRupture
                              ? "text-red-600 font-semibold"
                              : "text-gray-500"
                          }`}
                        >
                          Stock : {l.produit.stock}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{l.quantite}</TableCell>
                  <TableCell className="font-semibold text-[#FF9800]">
                    {formatPrice(Number(l.prix_Unitaire))}
                  </TableCell>

                  <TableCell className="font-bold text-[#2D8A47]">
                    {formatPrice(Number(l.total))}
                  </TableCell>

                  <TableCell>
                    {new Date(l.vente.dateVente).toLocaleDateString("fr-FR")}
                  </TableCell>

                  {/* ACTION */}
                  <TableCell className="text-center space-x-2">
                    <div className="flex justify-center">
                      {/* 🔴 BADGE RUPTURE */}
                        {isRupture && (
                          <span className="
                            px-2 py-0.5
                            text-xs font-semibold
                            rounded-full
                            bg-red-100 text-red-700
                            border border-red-300
                          ">
                            Rupture
                          </span>
                      )}
                      
                      {/* ➤ Bouton dépôt — montré UNIQUEMENT dans "En attente" */}
                      {lineViewMode === "pending" && !isRupture && (
                        <Button
                          size="sm"
                          title="Marquer comme déposé"
                          onClick={() => handleCheckLine(l.id)}
                          className="
                            bg-[#2D8A47] text-white 
                            hover:bg-[#245A35]
                            px-3 py-2 rounded-full
                          "
                        >
                          <CheckCircle className="h-5 w-5 text-white" />
                        </Button>
                      )}

                      {/* ➤ Bouton suppression — montré UNIQUEMENT dans "Déposé" */}
                      {lineViewMode === "delivered" && (
                        <Button
                          size="sm"
                          onClick={() => hideLine(l.id)}
                          className="bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-full flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};


  // contenu d'analyse
  const renderAnalytics = () => {
    return (
      <>
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des ventes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p>Graphique des ventes à venir</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition des paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>MVola</span>
                  </div>
                  <span className="font-medium">45%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Orange Money</span>
                  </div>
                  <span className="font-medium">30%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Carte bancaire</span>
                  </div>
                  <span className="font-medium">20%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-700 rounded-full"></div>
                    <span>Airtel Money</span>
                  </div>
                  <span className="font-medium">5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  };
  
  return (
    <div className="px-6 py-4">

      <div className="container mx-auto px-4 py-4">
        {currentView === "overview" && renderOverview()}
        {currentView === "products" && renderProducts()}
        {currentView === "sponsor" && renderSponsor()}
        {currentView === "orders" && renderOrders()}
        {/* {currentView === "analytics" && renderAnalytics()} */}
      </div>

      {/* New Product Modal */}
      <NewProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => {
          setIsNewProductModalOpen(false);
          setSelectedProduct(null);
        }}
        categories={categories}
        onSave={handleNewProduct}
      />

      <ModifyProductModal
        isOpen={isModifyProductModalOpen}
        onClose={() => {
          setModifyProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={async (updatedProduct) => {
          await fetchProducts();
          setModifyProductModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        categories={categories}
      />

      <ViewProductModal
        isOpen={isViewProductModalOpen}
        onClose={() => setIsViewProductModalOpen(false)}
        product={viewedProduct}
        categories={categories}
      />

      <NewLocationModal
        isOpen={isNewLocationModalOpen}
        onClose={() => {
          setIsNewLocationModalOpen(false);
          setSelectedProduct(null);
        }}
        categories={categories}
        onSave={handleNewProduct}
      />
    </div>
  );
}