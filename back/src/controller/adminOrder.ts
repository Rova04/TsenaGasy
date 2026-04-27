// back/src/controller/adminOrder.ts
import { Request, Response } from "express";
import prisma from "../config/db";

// suivi de commande par admin
export const getAllOrdersAdmin = async (req: Request, res: Response) => {
  try {
    const ventes = await prisma.vente.findMany({
      orderBy: { dateVente: "desc" },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            email: true,
            tel: true,
            adresse: true,
          },
        },
        livraison: true,
        paiement: true,
        lignes: {
          include: {
            produit: {
              select: {
                id: true,
                nom: true,
                magasinId: true,
              },
            },
            magasin: {
              select: {
                id_magasin: true,
                nom_Magasin: true,
              },
            },
          },
        },
      },
    });

    return res.json(ventes);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({
      error: "Erreur getAllOrdersAdmin",
      detail: e?.message,
    });
  }
};

// update statut vente en expédiée
export const shipOrderAdmin = async (req: Request, res: Response) => {
  try {
    const { venteId } = req.params;

    // vérifier que la vente existe + récupérer lignes + livraison
    const vente = await prisma.vente.findUnique({
      where: { id: venteId },
      include: { lignes: true, livraison: true }
    });

    if (!vente) {
      return res.status(404).json({ error: "Vente introuvable" });
    }

    // vérifier que toutes les lignes sont déposées
    const allOk = vente.lignes.length > 0 && vente.lignes.every(l => l.depotOk);

    if (!allOk) {
      return res.status(400).json({
        error: "Impossible d'expédier : tous les articles ne sont pas déposés"
      });
    }

    // update vente + livraison
    const updated = await prisma.vente.update({
      where: { id: venteId },
      data: {
        statut: "expedie",
        livraison: {
          update: {
            statut: "livré",
            date_effective: new Date()
          }
        }
      },
      include: { livraison: true }
    });

    return res.json(updated);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({
      error: "Erreur shipOrderAdmin",
      detail: e?.message
    });
  }
};

//récupérer les lignes pour chaque vendeur concerné
export const getPendingLinesForVendor = async (req: Request, res: Response) => {
  try {
    const { magasinId } = req.params;

    const lignes = await prisma.ligneVente.findMany({
      where: {
        magasinId,
        depotOk: false, 
        archivedByVendor: false
      },
      orderBy: {
        vente: { dateVente: "asc" }, // tri par date de vente (via relation)
      },
      include: {
        produit: {
          select: {
            id: true,
            nom: true,
            images: true,
            prix: true,
            stock: true,
          },
        },
        vente: {
          select: {
            id: true,
            dateVente: true,
            idUser: true,
            user: {
              select: {
                nom: true,
                tel: true,
                adresse: true,
              },
            },
          },
        },
      },
    });

    return res.json(lignes);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({
      error: "Erreur getPendingLinesForVendor",
      detail: e?.message,
    });
  }
};

//valider une ligne par le vendeur
export const checkLineVendor = async (req: Request, res: Response) => {
  try {
    const { lineId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // 1) récupérer la ligne + qté + produitId (léger)
      const ligne = await tx.ligneVente.findUnique({
        where: { id: lineId },
        select: {
          id: true,
          depotOk: true,
          quantite: true,
          produitId: true,
        },
      });

      if (!ligne) throw new Error("Ligne introuvable");
      if (ligne.depotOk) return ligne;

      const qte = ligne.quantite;

      if (!ligne.produitId) {
        return { error: "PRODUIT_INDISPONIBLE" };
      }

      // 2) décrémenter stock SEULEMENT si stock suffisant
      const dec = await tx.produit.updateMany({
        where: {
          id: ligne.produitId,
          stock: { gte: qte },
        },
        data: {
          stock: { decrement: qte },
        },
      });

      if (dec.count === 0) {
        // stock insuffisant
        return { error: "STOCK_INSUFFISANT" };
      }

      // 3) valider la ligne
      const updatedLine = await tx.ligneVente.update({
        where: { id: lineId },
        data: {
          depotOk: true,
          depotAt: new Date(),
        },
        include: {
          produit: { select: { id: true, nom: true, stock: true } },
          vente: { select: { id: true, dateVente: true } },
        },
      });

      return updatedLine;
    }, {
      maxWait: 8000,  // augmente le temps d'attente pour obtenir un slot
      timeout: 10000 // durée max de la transaction
    });

    if ((result as any).error === "STOCK_INSUFFISANT") {
      return res.status(200).json({
        ok: false,
        message: "Stock insuffisant, la vente n'a pas pu être effectuée.",
      });
    }

    return res.json({ ok: true, data: result });

  } catch (e: any) {
    console.error(e);

    if (e.message === "Ligne introuvable") {
      return res.status(404).json({ error: e.message });
    }

    return res.status(500).json({
      error: "Erreur checkLineVendor",
      detail: e?.message,
    });
  }
};

// 3 dernières lignes de vente pour un vendeur (par magasin)
export const getRecentLinesForVendor = async (req: Request, res: Response) => {
  try {
    const { magasinId } = req.params;

    const lignes = await prisma.ligneVente.findMany({
      where: {
        magasinId,           
      },
      orderBy: {
        vente: { dateVente: "desc" },
      },
      take: 3,              
      include: {
        produit: {
          select: {
            id: true,
            nom: true,
            images: true,
          },
        },
        vente: {
          select: {
            id: true,
            dateVente: true,
            statut: true,
            user: {
              select: {
                nom: true,
                tel: true,
                adresse: true,
              },
            },
          },
        },
      },
    });

    return res.json(lignes);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({
      error: "Erreur getRecentLinesForVendor",
      detail: e?.message,
    });
  }
};
