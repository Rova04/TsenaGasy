// back/src/controller/dashboardController.ts

import { Request, Response } from 'express'
import prisma from '../config/db'

// statistique pour les cartes dans vendeur
export const getVendorStats = async (req: Request, res: Response) => {
  try {
    const { magasinId } = req.params;

    if (!magasinId) {
      return res.status(400).json({ error: "magasinId requis." });
    }

    // Commandes du vendeur
    const totalOrders = await prisma.vente.count({
      where: {
        panier: {
          lignes: {
            some: {
              produit: { magasinId }
            }
          }
        }
      }
    });

    // Produits actifs
    const activeProducts = await prisma.produit.count({
      where: {
        magasinId,
        statut: {
          in: ["publie", "publié", "approuvé", "validé"]
        }
      }
    });

    //Sponsors validés
    const validSponsors = await prisma.sponsor.count({
      where: {
        statut: "validé",
        produit: { magasinId }
      }
    });

    return res.json({
      totalOrders,
      activeProducts,
      validSponsors
    });

  } catch (error) {
    console.error("Erreur getVendorStats :", error);
    res.status(500).json({ error: "Erreur lors du chargement des statistiques." });
  }
};

// pour dashboard d'admin
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Total utilisateurs
    const totalUsers = await prisma.utilisateur.count();

    // Utilisateurs actifs (connexion < 3 mois)
    const activeUsers = await prisma.utilisateur.count({
      where: {
        lastLogin: {
          gte: threeMonthsAgo
        }
      }
    });

    // Produits validés
    const totalProducts = await prisma.produit.count({
      where: { statut: "validé" }
    });

    // Sponsors validés
    const totalSponsors = await prisma.sponsor.count({
      where: { statut: "validé" }
    });

    res.json({
      totalUsers,
      activeUsers,
      totalProducts,
      totalSponsors
    });

  } catch (error) {
    console.error("Erreur getAdminStats :", error);
    res.status(500).json({ error: "Erreur récupération statistiques" });
  }
};

// pour profile dans client
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        magasins: true, // le vendeur peut avoir plusieurs magasins
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const firstStore = user.role === "vendor" && user.magasins.length > 0
      ? user.magasins[0].nom_Magasin
      : null;

    const formattedProfile = {
      id: user.id,
      role: user.role,

      name: user.nom,
      email: user.email,
      tel: user.tel,
      adresse: user.adresse,

      storeName: firstStore, // null si pas vendeur
    };

    return res.json(formattedProfile);

  } catch (error) {
    console.error("Erreur getUserProfile :", error);
    return res.status(500).json({
      error: "Erreur lors de la récupération du profil utilisateur.",
    });
  }
};

// désactivation intelligente des sponsors expiré
async function disableExpiredSponsors() {
  try {
    const now = new Date();

    await prisma.sponsor.updateMany({
      where: {
        statut: "validé",
        dateFin: { lt: now }
      },
      data: { statut: "refusé" }
    });

    console.log("Sponsors expirés désactivés automatiquement");

  } catch (error) {
    console.error("Erreur disableExpiredSponsors:", error);
  }
}

// pour les sponsors dans la bannière
export const getAllSponsoredProducts = async (req: Request, res: Response) => {
  try {

    disableExpiredSponsors();
    const now = new Date();

    const sponsors = await prisma.sponsor.findMany({
      where: {
        statut: "validé",
        dateFin: { gt: now }, // sponsor encore valide
      },
      include: {
        produit: {
          include: {
            magasin: true,
            categorie: true,
            produitLocation: true,
          },
        },
      },
      orderBy: { dateDebut: "asc" },
    });

    if (!sponsors || sponsors.length === 0) {
      return res.status(200).json([]);
    }

    // FORMATAGE DES DONNÉES POUR LE FRONT
    const formatted = sponsors.map((s) => ({
      id: s.id,
      produitId: s.produitId,

      // --- Produit ---
      title: s.produit.nom,
      desc: s.produit.descriptions,
      price: Number(s.produit.prix), // on renvoie un number propre
      images: s.produit.images ?? [],
      tags: s.produit.tags ?? [],
      typeProduit: s.produit.isLocation ? "location" : "vente",
      typePrix: s.produit.produitLocation?.typePrix ?? null,

      // --- Catégorie ---
      category: s.produit.categorie?.nomCat ?? null,

      // --- Magasin ---
      magasin: s.produit.magasin?.nom_Magasin ?? null,
    }));

    return res.status(200).json(formatted);

  } catch (error) {
    console.error("Erreur getAllSponsoredProducts :", error);
    return res.status(500).json({ error: "Erreur lors du chargement des sponsors." });
  }
};

// récupérer les produits
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.produit.findMany({
      where: {
        statut: { in: ["publie", "publié", "validé", "approuvé"] },
      },
      include: {
        magasin: { select: { nom_Magasin: true, type: true } },
        categorie: { select: { nomCat: true } },
        produitLocation: { select: { typePrix: true } },
        Sponsor: { select: { statut: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      nom: p.nom,
      prix: Number(p.prix),
      stock: p.stock,
      images: p.images ?? [],
      tags: p.tags ?? [],
      isLocation: p.isLocation,

      // obligatoires
      categorie: { nomCat: p.categorie.nomCat },
      magasin: { nom_Magasin: p.magasin.nom_Magasin, type: p.magasin.type },

      // optionnel
      typePrix: p.produitLocation?.typePrix ?? null,
      Sponsor: p.Sponsor ?? null,
    }));

    return res.status(200).json(formatted);
  } catch (e) {
    console.error("Erreur getAllProducts:", e);
    return res.status(500).json({ error: "Erreur récupération produits" });
  }
};

// récupérer les details
export const getProductDetailsById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "id requis" });

    const p = await prisma.produit.findUnique({
      where: { id },
      include: {
        magasin: { select: { nom_Magasin: true, type: true } },
        categorie: { select: { nomCat: true } },
        produitLocation: true,
        Sponsor: true,
      },
    });

    if (!p) return res.status(404).json({ error: "Produit introuvable" });

    return res.status(200).json({
      id: p.id,
      nom: p.nom,
      prix: Number(p.prix),
      stock: p.stock,
      images: p.images ?? [],
      tags: p.tags ?? [],
      descriptions: p.descriptions,
      poids: p.poids,
      dimensions: p.dimensions,
      materiaux: p.materiaux,
      isLocation: p.isLocation,

      // obligatoires
      categorie: { nomCat: p.categorie.nomCat },
      magasin: { nom_Magasin: p.magasin.nom_Magasin, type: p.magasin.type },

      // optionnels
      produitLocation: p.produitLocation ?? null,
      Sponsor: p.Sponsor ?? null,
    });
  } catch (e) {
    console.error("Erreur getProductById:", e);
    return res.status(500).json({ error: "Erreur récupération produit" });
  }
};

//getFavStat d'un user
export const getFavCountByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId requis." });
    }

    const favCount = await prisma.favori.count({
      where: { userId },
    });

    return res.status(200).json({ count: favCount });

  } catch (error) {
    console.error("Erreur getFavCountByUser:", error);
    return res.status(500).json({ error: "Erreur récupération nombre favoris." });
  }
};

