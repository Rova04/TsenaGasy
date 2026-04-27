// back/src/controller/user.controller.ts

import { Request, Response } from 'express'
import prisma from '../config/db'
import * as jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase'
import Stripe from "stripe";
import { supabaseAdmin } from '../config/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key'

// Mapper rôle DB → rôle normalisé anglais
const roleMapper = (role: string): string => {
  switch (role) {
    case 'acheteur': return 'client'
    case 'commercant': return 'vendor'
    case 'relationClient': return 'customerSupport'
    case 'superAdmin': return 'admin'
    default: return 'client'
  }
}

// création user
export const addClient = async (req: Request, res: Response) => {
  try {
    const { email, nom, tel, adresse, role, motDePasse, type, nomEntreprise } = req.body;
    
    if (!email || !motDePasse || !role || !nom || !tel || !adresse) {
      return res.status(400).json({ message: "Nom, email, téléphone, adresse, rôle et mot de passe sont requis" })
    }

    if (role === "commercant" && (!type || !nomEntreprise)) {
      return res.status(400).json({ message: "Un commerçant doit fournir un type et un nomEntreprise" })
    }

    // Vérifier doublon
    const existing = await prisma.utilisateur.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ message: "Utilisateur déjà existant" })

    // Création dans Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password: motDePasse })
    
    if (error) return res.status(400).json({ message: error.message })
    const supabaseId = data.user?.id
    if (!supabaseId) return res.status(500).json({ message: "Erreur Supabase: pas de supabaseId" })

    // Création Prisma
    const utilisateur = await prisma.utilisateur.create({
      data: {
        supabaseId,
        email,
        nom,
        tel,
        adresse,
        role: roleMapper(role),
        lastLogin: new Date()
      }
    });

    let magasin = null;
    let onboardingUrl: string | null = null;

    if (role === "commercant") {
      magasin = await prisma.magasin.create({
        data: {
          nom_Magasin: nomEntreprise,
          statut: "en_attente",
          id_proprietaire: utilisateur.id,
          type: type
        },
      });

      // const account = await stripe.accounts.create({
      //   type: "express",
      //   country: "MG",
      //   email: utilisateur.email,
      //   capabilities: {
      //     card_payments: { requested: true },
      //     transfers: { requested: true },
      //   },
      //   metadata: {
      //     magasinId: magasin.id_magasin,
      //     proprietaireId: utilisateur.id,
      //   },
      // });

      // 3) stocker stripeAccountId dans magasin
      // magasin = await prisma.magasin.update({
      //   where: { id_magasin: magasin.id_magasin },
      //   data: { stripeAccountId: account.id },
      // });
      
      // const accountLink = await stripe.accountLinks.create({
      //   account: account.id,
      //   type: "account_onboarding",
      //   return_url: `${process.env.FRONT_URL}/dashboard?onboarding=success`,
      //   refresh_url: `${process.env.FRONT_URL}/dashboard?onboarding=refresh`,
      // });

      // onboardingUrl = accountLink.url;
      
    }
    const idMagasin = magasin?.id_magasin || null;

    return res.status(201).json({
      message: "Utilisateur créé avec succès",
      token: data.session?.access_token, // identique à login
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        role: utilisateur.role,
        magasinId: idMagasin,
      },
      onboardingUrl,
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

// login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, motDePasse } = req.body

    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'Email et mot de passe requis' })
    }

    // 1. Vérifier via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse
    })

    if (error) return res.status(401).json({ message: error.message })
    if (!data.user) return res.status(404).json({ message: 'Utilisateur Supabase introuvable' })

    // 2. Récupérer l’utilisateur côté Prisma
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      include: {
        magasins: true, 
      },
    });

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé dans Prisma' });
    }

    // MAJ lastLogin
    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { lastLogin: new Date() }
    });

    let idMagasin = null;
    if (utilisateur.role === "vendor") { // rôle normalisé
      // tu peux aussi filtrer uniquement les magasins valides ou actifs si besoin
      idMagasin = utilisateur.magasins?.[0]?.id_magasin || null;
    }

    return res.json({
      message: 'Connexion réussie',
      token: data.session?.access_token, 
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        role: utilisateur.role,
        magasinId: idMagasin,
      }
    });
  } catch (error) {
    console.error('Erreur login:', error)
    return res.status(500).json({ message: 'Erreur serveur', error })
  }
}


export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    // Vérifier si utilisateur existe dans Prisma
    const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
    if (!utilisateur) {
      return res.status(404).json({ message: "Aucun utilisateur trouvé avec cet email" });
    }

    // Demander à Supabase d’envoyer le lien de reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password", // ou ton domaine
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({ message: "Un email de réinitialisation a été envoyé !" });
  } catch (error) {
    console.error("Erreur forgotPassword:", error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "Nouveau mot de passe requis" });
    }

    // Ici, Supabase utilise la session en cours (après clic sur le lien envoyé par email).
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({ message: "Mot de passe réinitialisé avec succès !" });
  } catch (error) {
    console.error("Erreur resetPassword:", error);
    return res.status(500).json({
      message: "Erreur serveur",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const adhesionVendor = async (req: Request, res: Response) => {
  try {
    const demandes = await prisma.magasin.findMany({
      where: {
        statut: { in: ["en_attente", "refuse"] }
      },
      include: {
        proprietaire: true, 
      }
    });

    const formatted = demandes.map(d => ({
      idMagasin: d.id_magasin,
      nomMagasin: d.nom_Magasin,
      type: d.type,
      statut: d.statut,
      proprietaire: {
        id: d.proprietaire.id,
        nom: d.proprietaire.nom,
        email: d.proprietaire.email,
        tel: d.proprietaire.tel,
        adresse: d.proprietaire.adresse,
        role: d.proprietaire.role,
        createdAt: d.proprietaire.createdAt
      }
    }));

    const sorted = formatted.sort((a, b) => b.proprietaire.createdAt.getTime() - a.proprietaire.createdAt.getTime());

    return res.json({ demandes: sorted });

  } catch (error) {
    console.error("Erreur adhesionVendor:", error);
    return res.status(500).json({ message: "Erreur serveur", error });
  }
};

// maj statut magasin
export const updateVendorStatus = async (req: Request, res: Response) => {

  try {
    const { idMagasin } = req.params;
    const { statut } = req.body; 

    if (!statut) {
      return res.status(400).json({ message: "Statut manquant" });
    }

    const updatedMagasin = await prisma.magasin.update({
      where: { id_magasin: idMagasin },
      data: { statut }
    });

    return res.json({ message: "Statut du magasin mis à jour", magasin: updatedMagasin });

  } catch (error) {
    console.error("Erreur updateMagasinStatus:", error);
    return res.status(500).json({ message: "Erreur serveur", error });
  }
};

// suppression totale d’un magasin (et éventuellement du commerçant)
export const deleteAdhesion = async (req: Request, res: Response) => {
  try {
    const { idMagasin } = req.params;

    if (!idMagasin) {
      return res.status(400).json({ message: "ID du magasin manquant" });
    }

    // Vérifier si le magasin existe
    const magasin = await prisma.magasin.findUnique({
      where: { id_magasin: idMagasin },
      include: { proprietaire: true },
    });

    if (!magasin) {
      return res.status(404).json({ message: "Magasin introuvable" });
    }

    // Supprimer le magasin
    await prisma.magasin.delete({
      where: { id_magasin: idMagasin },
    });

    // Optionnel : supprimer aussi le commerçant associé s’il n’a plus d’autres magasins
    const autresMagasins = await prisma.magasin.findMany({
      where: { id_proprietaire: magasin.id_proprietaire },
    });

    if (autresMagasins.length === 0) {
      await prisma.utilisateur.delete({
        where: { id: magasin.id_proprietaire },
      });
    }

    return res.json({ message: "Magasin supprimé avec succès" });

  } catch (error) {
    console.error("Erreur deleteAdhesion:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la suppression du magasin",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;

    const users = await prisma.utilisateur.findMany({
      where: { id: { not: adminId } },
      orderBy: { createdAt: 'desc' },
      include: {
        magasins: {
          select: {
            statut: true,
          },
        },
      },
    });

    // Formater les données de retour
    const formattedUsers = users.map((u) => {
      // par défaut pas de statut magasin
      let magasinStatus: string | null = null;

      // si c'est un vendeur, on prend le statut de son premier magasin (si existe)
      if (u.role === "vendor" && u.magasins.length > 0) {
        magasinStatus = u.magasins[0].statut; // ex: "en_attente", "refuse", "approuve"
      }

      return {
        id: u.id,
        nom: u.nom,
        email: u.email,
        tel: u.tel,
        adresse: u.adresse,
        role: u.role,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        magasinStatus, // 🔥 nouveau champ
      };
    });

    return res.json({ users: formattedUsers });
  } catch (error) {
    console.error("Erreur getAllUsers:", error);
    return res.status(500).json({ message: "Erreur serveur", error });
  }
};

//supprimer un utilisateur
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // id Prisma (UUID)

    if (!id) {
      return res.status(400).json({ message: "ID utilisateur manquant" });
    }

    // 1) Vérifier l'utilisateur existe
    const user = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        magasins: {
          include: {
            produits: {
              include: {
                produitLocation: true,
                Sponsor: true,
              },
            },
          },
        },
        paniers: true,
        favoris: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (user.supabaseId && supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.supabaseId);
      if (error) console.error("Supabase deleteUser error:", error);
    }

    await prisma.$transaction(async (tx) => {

      // A) Supprimer les FAVORIS (user→favori)
      await tx.favori.deleteMany({
        where: { userId: id },
      });

      // B) Supprimer les PANIERS + lignes
      for (const panier of user.paniers) {
        await tx.lignePanier.deleteMany({
          where: { idPanier: panier.id },
        });

        await tx.panier.delete({
          where: { id: panier.id },
        });
      }

      // C) Supprimer les MAGASINS + PRODUITS + SPONSOR + PRODUIT_LOCATION
      for (const magasin of user.magasins) {
        for (const produit of magasin.produits) {
          // produitLocation
          if (produit.produitLocation) {
            await tx.produitLocation.delete({
              where: { id: produit.produitLocation.id },
            });
          }

          // sponsor
          if (produit.Sponsor) {
            await tx.sponsor.delete({
              where: { id: produit.Sponsor.id },
            });
          }

          // lignesPanier liées au produit
          await tx.lignePanier.deleteMany({
            where: { idProduit: produit.id },
          });

          // supprimer produit
          await tx.produit.delete({
            where: { id: produit.id },
          });
        }

        // supprimer le magasin
        await tx.magasin.delete({
          where: { id_magasin: magasin.id_magasin },
        });
      }

      // D) supprimer utilisateur
      await tx.utilisateur.delete({
        where: { id },
      });
    });

    return res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error: any) {
    console.error("Erreur deleteUser:", error);

    return res.status(500).json({
      message: "Erreur serveur lors de la suppression de l'utilisateur",
      detail: error?.message,
    });
  }
};

// modifier role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role manquant" });
    }

    // 1) Vérifier l'utilisateur
    const user = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        magasins: {
          include: { produits: true }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // 2) Gestion VENDOR → CREATION MAGASIN
    if (role === "vendor") {
      const hasShop = user.magasins.length > 0;

      if (!hasShop) {
        await prisma.magasin.create({
          data: {
            nom_Magasin: `${user.nom} Shop`,
            type: "freelance",
            statut: "approuve",
            id_proprietaire: id,
          },
        });
      }
    }

    // 3) Gestion CLIENT → SUPPRESSION SHOP + PRODUITS
    if (role === "client") {
      for (const shop of user.magasins) {
        
        const produits = await prisma.produit.findMany({
          where: { magasinId: shop.id_magasin },
          select: { id: true }
        });

        for (const p of produits) {
          await prisma.produit.delete({ where: { id: p.id } });
        }

        await prisma.magasin.delete({
          where: { id_magasin: shop.id_magasin },
        });
      }
    }

    // 4) Mise à jour du rôle
    const updatedUser = await prisma.utilisateur.update({
      where: { id },
      data: { role },
    });

    return res.json({
      message: "Rôle mis à jour avec succès",
      user: updatedUser,
    });

  } catch (error) {
    console.error("Erreur updateUserRole:", error);
    return res.status(500).json({
      message: "Erreur serveur",
      detail: error instanceof Error ? error.message : error,
    });
  }
};
