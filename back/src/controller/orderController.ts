// back/src/controller/orderController.ts
import { Request, Response } from 'express'
import prisma from '../config/db'
import path from "path";
import fs from "fs/promises";

//création commande
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      panierId,
      idUser,
      adresse_livraison,
      contact_phone,
      mode = "standard",
      frais_livraison = 0,
      total,
    } = req.body;

    if (!panierId || !idUser || !adresse_livraison || !contact_phone || total == null) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    const panier = await prisma.panier.findUnique({
      where: { id: panierId },
      select: {
        id: true,
        idClient: true,
        lignes: {
          select: {
            idProduit: true,
            quantite: true,
            prix_Unitaire: true,
            total: true,
            produit: { select: { nom: true, magasinId: true } },
          },
        },
      },
    });

    if (!panier) return res.status(404).json({ error: "Panier introuvable" });
    if (panier.idClient !== idUser) return res.status(403).json({ error: "Ce panier ne t'appartient pas" });
    if (panier.lignes.length === 0) return res.status(400).json({ error: "Panier vide" });

    const subtotal = panier.lignes.reduce((sum, l) => sum + Number(l.total), 0);
    const totalCheck = subtotal + Number(frais_livraison);

    if (Number(total) !== Number(totalCheck)) {
      return res.status(400).json({
        error: "Total invalide",
        detail: { subtotal, frais_livraison, totalCheck, total },
      });
    }

    // 1) Transaction DB : on crée la vente, les lignes, la livraison et un paiement "en attente"
    const vente = await prisma.$transaction(async (tx) => {
      const v = await tx.vente.create({
        data: {
          idPanier: panier.id,
          idUser,
          total,
          statut: "en_attente_paiement", // 👈 clair dans ton modèle

          facture_url: null,
          facture_numero: null,

          livraison: {
            create: {
              adresse_livraison,
              contact_phone,
              mode,
              frais_livraison,
              statut: "préparée",
              paiement_collecte: false,
            },
          },

          paiement: {
            create: {
              mode: "carte",           
              montant: total,
              statut: "en attente",
            },
          },
        },
      });

      // lignes de vente
      await tx.ligneVente.createMany({
        data: panier.lignes.map((l) => ({
          venteId: v.id,
          produitId: l.idProduit,
          magasinId: l.produit.magasinId,
          quantite: l.quantite,
          prix_Unitaire: l.prix_Unitaire,
          total: l.total,
        })),
      });

      // vider le panier
      await tx.lignePanier.deleteMany({ where: { idPanier: panier.id } });

      return v;
    });

    // ⚠️ ICI : on ne génère PAS encore la facture, on ne mail PAS
    // on renvoie juste ce qu’il faut au front
    return res.status(201).json({
      venteId: vente.id,
      total: vente.total,
      statut: vente.statut,
    });

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({
      error: "Erreur serveur createOrder",
      detail: e?.message,
    });
  }
};

// afficher les commandes
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ error: "userId manquant" });

    const ventes = await prisma.vente.findMany({
      where: {
        idUser: userId,
        archivedByClient: false
      },
      orderBy: { dateVente: "desc" },
      include: {
        lignes: {
          include: {
            produit: { select: { nom: true } },
          },
        },
        livraison: true,
        paiement: true,
      },
    });

    return res.json(ventes);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Erreur getMyOrders", detail: e?.message });
  }
};

//suppression [hard] de commande (côté admin)
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "orderId manquant" });
    }

    // 1) vérifier que la vente existe + statut expedie
    const vente = await prisma.vente.findUnique({
      where: { id: orderId },
      include: { livraison: true },
    });

    if (!vente) {
      return res.status(404).json({ error: "Commande introuvable" });
    }

    if (vente.statut !== "expedie") {
      return res.status(403).json({
        error: "Suppression autorisée uniquement quand la commande est expédié.",
        statut: vente.statut,
      });
    }

    // suppression PDF
    if (vente.facture_url) {
      const fileName = path.basename(vente.facture_url);
      const facturePath = path.join(
        process.cwd(),
        "src/public/factures",
        fileName
      );

      try {
        await fs.unlink(facturePath);
        console.log(" Facture supprimée :", facturePath);
      } catch (err: any) {
        console.warn("⚠️ Impossible de supprimer la facture :", err?.message);
      }
    }

    // 2) supprimer la vente (cascade fera le reste)
    await prisma.vente.delete({
      where: { id: orderId },
    });

    return res.json({ success: true, message: "Commande supprimée." });

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({
      error: "Erreur deleteOrder",
      detail: e?.message,
    });
  }
};

// suppression côté client
export const hideOrderFromClient = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "orderId manquant" });
    }

    // vérifier que la commande appartient au client
    const vente = await prisma.vente.findUnique({ where: { id: orderId } });

    if (!vente) {
      return res.status(404).json({ error: "Commande introuvable" });
    }

    // on archive
    await prisma.vente.update({
      where: { id: orderId },
      data: { archivedByClient: true }
    });

    return res.json({ success: true, message: "Commande masquée pour le client." });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur hideOrderFromClient" });
  }
};

//suppression lignes (commandes) déposés dans vendeur
export const hideLineForVendor = async (req: Request, res: Response) => {
  try {
    const { lineId } = req.params;

    const line = await prisma.ligneVente.findUnique({ where: { id: lineId } });
    if (!line) return res.status(404).json({ error: "Ligne introuvable" });

    await prisma.ligneVente.update({
      where: { id: lineId },
      data: { archivedByVendor: true },
    });

    return res.json({ success: true, message: "Ligne masquée pour le vendeur." });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur hideLineForVendor" });
  }
};

// affichage historique commande dans vendeur
export const getDeliveredLinesForVendor = async (req: Request, res: Response) => {
  const { magasinId } = req.params;

  const lignes = await prisma.ligneVente.findMany({
    where: {
      magasinId,
      depotOk: true,
      archivedByVendor: false,
    },
    include: {
      produit: true,
      vente: { include: { user: true } },
    },
  });

  return res.json(lignes);
};