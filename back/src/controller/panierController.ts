// back/src/controller/panierController.ts

import { Request, Response } from 'express'
import prisma from '../config/db'

// Ajout un produit en favori
export const addFavori = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { produitId } = req.body as { produitId?: string };

    if (!userId) return res.status(400).json({ error: "userId requis" });
    if (!produitId) return res.status(400).json({ error: "produitId requis" });

    // vérifier user existe
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    // vérifier produit existe
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true },
    });
    if (!produit) return res.status(404).json({ error: "Produit introuvable" });

    // créer favori (la contrainte unique empêche doublons)
    const fav = await prisma.favori.create({
      data: { userId, produitId },
    });

    return res.status(201).json(fav);
  } catch (e: any) {
    console.error("Erreur addFavori:", e);

    // doublon (déjà en favori)
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Produit déjà en favori" });
    }

    return res.status(500).json({ error: "Erreur ajout favori" });
  }
};

// Supprimer un produit des favoris
export const removeFavori = async (req: Request, res: Response) => {
  try {
    const { userId, produitId } = req.params;

    if (!userId) return res.status(400).json({ error: "userId requis" });
    if (!produitId) return res.status(400).json({ error: "produitId requis" });

    // supprimer via clé composite
    await prisma.favori.delete({
      where: {
        userId_produitId: {
          userId,
          produitId,
        },
      },
    });

    return res.status(200).json({ message: "Favori supprimé" });
  } catch (e: any) {
    console.error("Erreur removeFavori:", e);

    // si pas trouvé
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Favori introuvable" });
    }

    return res.status(500).json({ error: "Erreur suppression favori" });
  }
};

// Récupérer les favoris d'un utilisateur
export const getFavorisByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId requis" });

    // vérifier user existe
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const favoris = await prisma.favori.findMany({
      where: { userId },
      include: {
        produit: {
          include: {
            magasin: { select: { nom_Magasin: true, type: true } },
            categorie: { select: { nomCat: true } },
            produitLocation: true, 
            Sponsor: true,         
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = favoris.map((f) => {
      const p = f.produit;

      return {
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

        // optionnels (comme détails produit)
        produitLocation: p.produitLocation ?? null,
        Sponsor: p.Sponsor ?? null,

        // optionnel propre aux favoris
        favoriCreatedAt: f.createdAt,
      };
    });

    return res.status(200).json(formatted);
  } catch (e) {
    console.error("Erreur getFavorisByUser:", e);
    return res.status(500).json({ error: "Erreur récupération favoris" });
  }
};

// ajout panier (léger)
export const addToPanier = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { produitId, qty } = req.body as { produitId?: string; qty?: number };

    if (!userId) return res.status(400).json({ error: "userId requis" });
    if (!produitId) return res.status(400).json({ error: "produitId requis" });

    const quantityToAdd = Math.max(1, qty ?? 1);

    // 1) créer ou récupérer le panier
    const panier = await prisma.panier.upsert({
      where: { idClient: userId },
      update: {},
      create: { idClient: userId },
      select: { id: true },
    });

    // 2) lire prix + stock + isLocation produit
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { prix: true, stock: true, isLocation: true },
    });

    if (!produit) return res.status(404).json({ error: "Produit introuvable" });

    // sécurité stock (pour vente normale)
    if (produit.stock < quantityToAdd) {
      return res.status(400).json({
        error: `Stock insuffisant (reste ${produit.stock})`,
      });
    }

    const prixUnitaire = Number(produit.prix);

    // 3) lire ligne existante
    const line = await prisma.lignePanier.findFirst({
      where: { idPanier: panier.id, idProduit: produitId },
      select: { id: true, quantite: true },
    });

    // ✅ CAS LOCATION : quantité max = 1
    if (produit.isLocation) {
      if (line) {
        // déjà dans le panier -> on ne fait rien
        return res.status(200).json({
          message: "Produit de location déjà dans le panier",
          panierId: panier.id,
          idProduit: produitId,
          quantite: line.quantite, // normalement 1
        });
      }

      await prisma.lignePanier.create({
        data: {
          idPanier: panier.id,
          idProduit: produitId,
          quantite: 1,
          prix_Unitaire: prixUnitaire,
          total: prixUnitaire,
        },
      });

      return res.status(200).json({
        message: "Produit de location ajouté au panier",
        panierId: panier.id,
        idProduit: produitId,
        quantite: 1,
      });
    }

    // ✅ CAS VENTE NORMALE : on additionne
    const newQty = (line?.quantite ?? 0) + quantityToAdd;

    if (line) {
      await prisma.lignePanier.update({
        where: { id: line.id },
        data: {
          quantite: newQty,
          prix_Unitaire: prixUnitaire,
          total: prixUnitaire * newQty,
        },
      });
    } else {
      await prisma.lignePanier.create({
        data: {
          idPanier: panier.id,
          idProduit: produitId,
          quantite: newQty,
          prix_Unitaire: prixUnitaire,
          total: prixUnitaire * newQty,
        },
      });
    }

    return res.status(200).json({
      message: "Produit ajouté au panier",
      panierId: panier.id,
      idProduit: produitId,
      quantite: newQty,
    });
  } catch (e) {
    console.error("Erreur addToPanier:", e);
    return res.status(500).json({ error: "Erreur ajout panier" });
  }
};

// Récupérer le panier d'un utilisateur
export const getPanierByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId requis" });

    // (optionnel) vérifier que user existe
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const panier = await prisma.panier.findUnique({
      where: { idClient: userId }, 
      include: {
        lignes: {
          include: {
            produit: {
              include: {
                magasin: { select: { nom_Magasin: true, type: true } },
                categorie: { select: { nomCat: true } },
                produitLocation: true,
                Sponsor: true,
              },
            },
          },
        },
      },
    });

    // s'il n'a pas encore de panier -> renvoyer panier vide
    if (!panier) {
      return res.status(200).json({
        id: null,
        idClient: userId,
        lignes: [],
      });
    }

    return res.status(200).json(panier);
  } catch (e) {
    console.error("Erreur getPanierByUser:", e);
    return res.status(500).json({ error: "Erreur récupération panier" });
  }
};

//supprimer article
export const removeLinePanier = async (req: Request, res: Response) => {
  try {
    const { userId, lineId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId requis" });
    if (!lineId) return res.status(400).json({ error: "lineId requis" });

    // 1) on récupère la ligne + son panier
    const line = await prisma.lignePanier.findUnique({
      where: { id: lineId },
      select: { id: true, idPanier: true },
    });

    if (!line) return res.status(404).json({ error: "Ligne introuvable" });

    // 2) vérifier que le panier appartient bien au user
    const panier = await prisma.panier.findUnique({
      where: { id: line.idPanier },
      select: { idClient: true },
    });

    if (!panier || panier.idClient !== userId) {
      return res.status(403).json({ error: "Action interdite" });
    }

    // 3) supprimer
    await prisma.lignePanier.delete({ where: { id: lineId } });

    return res.status(200).json({
      message: "Ligne supprimée",
      lineId,
    });
  } catch (e) {
    console.error("Erreur removeLinePanier:", e);
    return res.status(500).json({ error: "Erreur suppression ligne panier" });
  }
};

// maj de quantité
export const updatePanier = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { produitId, qty } = req.body as { produitId?: string; qty?: number };

    if (!userId) return res.status(400).json({ error: "userId requis" });
    if (!produitId) return res.status(400).json({ error: "produitId requis" });
    if (qty == null) return res.status(400).json({ error: "qty requis" });

    const wantedQty = Math.floor(qty);

    // 1) récupérer panier
    const panier = await prisma.panier.findUnique({
      where: { idClient: userId },
      select: { id: true },
    });
    if (!panier) {
      return res.status(404).json({ error: "Panier introuvable" });
    }

    // 2) récupérer produit stock/prix/type
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { prix: true, stock: true, isLocation: true },
    });
    if (!produit) return res.status(404).json({ error: "Produit introuvable" });

    // 3) récupérer ligne
    const line = await prisma.lignePanier.findFirst({
      where: { idPanier: panier.id, idProduit: produitId },
      select: { id: true, quantite: true },
    });
    if (!line) return res.status(404).json({ error: "Ligne introuvable" });

    // ✅ CAS LOCATION : quantité toujours 1
    if (produit.isLocation) {
      if (line.quantite !== 1) {
        await prisma.lignePanier.update({
          where: { id: line.id },
          data: {
            quantite: 1,
            prix_Unitaire: Number(produit.prix),
            total: Number(produit.prix),
          },
        });
      }

      const updatedPanier = await prisma.panier.findUnique({
        where: { id: panier.id },
        include: { lignes: { include: { produit: true } } },
      });

      return res.status(200).json({
        message: "Quantité location figée à 1",
        panier: updatedPanier,
      });
    }

    // ✅ CAS VENTE : qty voulue
    if (wantedQty <= 0) {
      await prisma.lignePanier.delete({ where: { id: line.id } });

      const updatedPanier = await prisma.panier.findUnique({
        where: { id: panier.id },
        include: { lignes: { include: { produit: true } } },
      });

      return res.status(200).json({
        message: "Ligne supprimée",
        panier: updatedPanier,
      });
    }

    if (wantedQty > produit.stock) {
      return res.status(400).json({
        error: `Stock insuffisant (reste ${produit.stock})`,
      });
    }

    const prixUnitaire = Number(produit.prix);

    await prisma.lignePanier.update({
      where: { id: line.id },
      data: {
        quantite: wantedQty,
        prix_Unitaire: prixUnitaire,
        total: prixUnitaire * wantedQty,
      },
    });

    const updatedPanier = await prisma.panier.findUnique({
      where: { id: panier.id },
      include: { lignes: { include: { produit: true } } },
    });

    return res.status(200).json({
      message: "Quantité mise à jour",
      panier: updatedPanier,
    });
  } catch (e) {
    console.error("Erreur updatePanier:", e);
    return res.status(500).json({ error: "Erreur update panier" });
  }
};

