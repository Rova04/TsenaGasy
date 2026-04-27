// back/src/controller/sponsorController.ts

import { Request, Response } from 'express'
import prisma from '../config/db'

// ajout de sponsor
export const createSponsor = async (req: Request, res: Response) => {
  try {
    const { produitId } = req.body;

    if (!produitId) {
      return res.status(400).json({ error: "L'ID du produit est requis." });
    }

    // Vérifier si le produit existe
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      include: {
        magasin: { include: { proprietaire: true } },
      },
    });

    if (!produit) {
      return res.status(404).json({ error: "Produit introuvable." });
    }

    // Vérifier si ce produit a déjà un sponsor
    const existingSponsor = await prisma.sponsor.findUnique({
      where: { produitId },
    });

    if (existingSponsor) {
      return res.status(400).json({
        error: "Ce produit est déjà sponsorisé ou en attente de validation.",
      });
    }

    // Création du sponsor
    const sponsor = await prisma.sponsor.create({
      data: {
        produitId,
        statut: "en_attente", // correspond au défaut dans ton modèle
        dateDebut: null,
        dateFin: null,
      },
      include: {
        produit: {
          include: {
            magasin: {
              include: { proprietaire: true },
            },
          },
        },
      },
    });
      
    const sponsorData = {
        id: sponsor.id,
        statut: sponsor.statut,
        dateDebut: sponsor.dateDebut,
        dateFin: sponsor.dateFin,
        produit: {
          id: produit.id,
          nom: produit.nom,
          prix: produit.prix,
          magasin: {
            id: produit.magasin.id_magasin,
            nom_Magasin: produit.magasin.nom_Magasin,
            proprietaire: {
              id: produit.magasin.proprietaire.id,
              nom: produit.magasin.proprietaire.nom,
              email: produit.magasin.proprietaire.email,
            },
          },
        },
    }

    return res.status(201).json({
      message: "Sponsor créé avec succès",
      sponsor: sponsorData,
    });
  } catch (error) {
    console.error("Erreur createSponsor:", error);
    return res.status(500).json({
      error: "Erreur interne lors de la création du sponsor.",
    });
  }
};

// récupérer sponsor pour chaque vendeur
export const getSponsorsByVendor = async (req: Request, res: Response) => {
  try {
    const { magasinId } = req.params;

    const sponsors = await prisma.sponsor.findMany({
      where: {
        produit: {
          magasinId
        }
      },
      include: {
        produit: true
      },
      orderBy: {
        dateDebut: "asc"
      }
    });

    res.status(200).json(sponsors);
  } catch (error) {
    console.error("Erreur récupération sponsors :", error);
    res.status(500).json({ error: "Erreur récupération sponsors" });
  }
};

// renvoyer une demande de sponsor
export const resendSponsor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sponsor = await prisma.sponsor.findUnique({
      where: { id },
    });

    if (!sponsor) {
      return res.status(404).json({ error: "Sponsor introuvable." });
    }

    if (sponsor.statut !== "refusé") {
      return res.status(400).json({ error: "Seules les demandes refusées peuvent être relancées." });
    }

    const updated = await prisma.sponsor.update({
      where: { id },
      data: {
        statut: "en_attente",
      },
    });

    res.status(200).json({ message: "Demande renvoyée !", sponsor: updated });
  } catch (error) {
    console.error("Erreur resend:", error);
    res.status(500).json({ error: "Erreur lors de la relance." });
  }
};

// suppression
export const deleteSponsor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sponsor = await prisma.sponsor.findUnique({
      where: { id },
    });

    if (!sponsor) {
      return res.status(404).json({ error: "Sponsor introuvable." });
    }

    await prisma.sponsor.delete({
      where: { id },
    });

    res.status(200).json({ message: "Sponsor supprimé avec succès." });
  } catch (error) {
    console.error("Erreur deleteSponsor:", error);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
};

// filtre par statut pour chaque vendeur
export const filterSponsorsByVendor = async (req: Request, res: Response) => {
  try {
    const { magasinId } = req.params;
    const { statut } = req.body;

    if (!magasinId) {
      return res.status(400).json({ error: "ID magasin requis." });
    }

    const whereClause: any = {
      produit: { magasinId }
    };

    if (statut && statut !== "all") {
      whereClause.statut = statut; 
    }

    const sponsors = await prisma.sponsor.findMany({
      where: whereClause,
      include: { produit: true },
      orderBy: { dateDebut: "desc" }
    });

    return res.status(200).json(sponsors);
  } catch (error) {
    console.error("Erreur filterSponsors:", error);
    return res.status(500).json({ error: "Erreur lors du filtrage." });
  }
};

// récupérer tous les sponsors pour admin
export const getAllSponsors = async (req: Request, res: Response) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: { dateDebut: "desc" },
      include: {
        produit: {
          include: {
            produitLocation: true,
            magasin: {
              include: {
                proprietaire: true
              }
            }
          }
        }
      }
    });

    const mapped = sponsors.map(s => ({
      id: s.id,
      statut: s.statut,
      dateDebut: s.dateDebut,
      dateFin: s.dateFin,
      
      produitNom: s.produit?.nom,
      prix: Number(s.produit?.prix),
      image: s.produit?.images?.[0],

      magasin: s.produit?.magasin?.nom_Magasin,
      proprietaireEmail: s.produit?.magasin?.proprietaire?.email,

      produit: s.produit 
    }));

    return res.status(200).json(mapped);

  } catch (error) {
    console.error("Erreur récupération sponsors :", error);
    return res.status(500).json({ error: "Erreur récupération sponsors" });
  }
};

// update sponsor par admin
export const updateSponsorStatusAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!["validé", "refusé", "en_attente"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide." });
    }

    const sponsor = await prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) {
      return res.status(404).json({ error: "Sponsor introuvable." });
    }

    // Choix des dates en fonction du statut
    let dataUpdate: any = { statut };

    if (statut === "validé") {
      const now = new Date();
      dataUpdate.dateDebut = now;
      dataUpdate.dateFin = new Date(now);
      dataUpdate.dateFin.setMonth(now.getMonth() + 1);
    } else {
      // refusé ou en_attente => pas de dates
      dataUpdate.dateDebut = null;
      dataUpdate.dateFin = null;
    }

    const updated = await prisma.sponsor.update({
      where: { id },
      data: dataUpdate,
      include: {
        produit: {
          include: {
            produitLocation: true,
            magasin: { include: { proprietaire: true } },
          },
        },
      },
    });

    // On garde EXACTEMENT la même structure que ton code d’origine
    const mapped = {
      id: updated.id,
      statut: updated.statut,
      dateDebut: updated.dateDebut,
      dateFin: updated.dateFin,

      produitNom: updated.produit?.nom,
      prix: Number(updated.produit?.prix),
      image: updated.produit?.images?.[0],

      magasin: updated.produit?.magasin?.nom_Magasin,
      proprietaireEmail: updated.produit?.magasin?.proprietaire?.email,

      produit: updated.produit,
    };

    return res.status(200).json({
      message: "Statut sponsor mis à jour !",
      sponsor: mapped,
    });

  } catch (err) {
    console.error("Erreur updateSponsor:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};

