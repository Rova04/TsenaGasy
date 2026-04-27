// back/src/controller/productController.ts

import { Request, Response } from 'express'
import prisma from '../config/db'
import { supabaseAdmin } from "../config/supabase";
import fs from "fs"
import path from "path";

// Récupérer toutes les catégories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.categorie.findMany({
      select: { id: true, nomCat: true }
    });

    const result = categories.map(cat => ({
      id: cat.id,
      nom: cat.nomCat
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erreur getCategories:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// ajout produits
export const createProduct = async (req: Request, res: Response) => {

  try {
    const { nom, prix, stock, categorieId, commercantId, tags, description, poids, dimensions, materiaux, statut} = req.body;

    if ( !nom || !prix || !stock || !categorieId || !commercantId || !description || !poids || !dimensions || !materiaux || !statut) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    const commercant = await prisma.utilisateur.findUnique({
      where: { id: commercantId },
      include: { magasins: true }
    });

    if (!commercant) {
      return res.status(404).json({ error: "Commerçant introuvable" });
    }

    if (!commercant.magasins || commercant.magasins.length === 0) {
      return res.status(400).json({ error: "Le vendeur n'a pas de magasin" });
    }

    const magasin = commercant.magasins[0];
    const magasinId = magasin.id_magasin;
    const nomEntreprise = magasin.nom_Magasin
      .replace(/\s+/g, "_")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // envoie de l'img dans supabase
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    const imageUrls: string[] = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      const uploadResults = await Promise.allSettled(
        uploadedFiles.map(async (file, i) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanName = nom
            .replace(/\s+/g, "_")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]/g, "");
          const uniqueId = Date.now();
          const fileName = `${cleanName}_${uniqueId}_${i + 1}${ext}`;
          const filePath = `${nomEntreprise}_${commercantId}/${fileName}`;

          const { error: uploadError } = await supabaseAdmin!.storage
            .from("Produits")
            .upload(filePath, fs.createReadStream(file.path), {
              cacheControl: "3600",
              upsert: true,
              contentType: file.mimetype,
              duplex: "half" as any,
            });

          fs.promises.unlink(file.path); // Supprime le fichier temporaire local

          if (uploadError) throw new Error(uploadError.message);

          const { data: publicUrlData } = supabaseAdmin!.storage
            .from("Produits")
            .getPublicUrl(filePath);

          return publicUrlData.publicUrl;
        })
      );

      // 🔹 Récupérer seulement les uploads réussis
      const successfulUploads = uploadResults
        .filter(r => r.status === "fulfilled")
        .map(r => (r as PromiseFulfilledResult<string>).value);

      // 🔹 Log et gestion d’échec partiel
      const failedCount = uploadResults.filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} image(s) non uploadée(s) correctement.`);
      }

      if (successfulUploads.length === 0) {
        return res.status(500).json({ error: "Échec total de l'upload des images" });
      }

      imageUrls.push(...successfulUploads);
    }

    const produit = await prisma.produit.create({
      data: {
        nom,
        prix: parseFloat(prix),
        stock: parseInt(stock),
        categorieId,
        magasinId,
        images: imageUrls,
        tags: tags ? tags.split(",") : [],
        descriptions: description,
        poids: parseInt(poids),
        dimensions,
        materiaux,
        statut
      },
    });

    res.status(201).json({
      message: "Produit créé avec succès",
      produit,
    });
  } catch (error) {
    console.error("Erreur createProduct:", error);
    res.status(500).json({ error: "Erreur lors de la création du produit" });
  }
};

export const getProductsByCommercant = async (req: Request, res: Response) => {
  try {
    const { magasinId } = req.params;

    if (!magasinId) {
      return res.status(400).json({ error: "ID du commerçant requis" });
    }

    // Récupération des produits liés à ce magasin
    const produits = await prisma.produit.findMany({
      where: { magasinId },
      include: {
        produitLocation: true,
        Sponsor: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (produits.length === 0) {
      return res.status(200).json({ message: "Aucun produit trouvé", produits: [] });
    }

    // Transformation des clés avant envoi
    const mappedProducts = produits.map(p => ({
      id: p.id,
      name: p.nom,
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
      createdAt: p.createdAt,
      locationDetails: p.produitLocation
        ? {
            caution: p.produitLocation.caution,
            duree_min: p.produitLocation.duree_min,
            disponible: p.produitLocation.disponible,
            typePrix: p.produitLocation.typePrix,
            lieuRecup: p.produitLocation.lieuRecup,
          }
        : null,
      sponsorisé: !!p.Sponsor,
      sponsorStatus: p.Sponsor ? p.Sponsor.statut : null
    }));

    return res.status(200).json(mappedProducts);

  } catch (error) {
    console.error("Erreur getProductsByCommercant:", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des produits" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "ID du produit requis" });
    }

    const produit = await prisma.produit.findUnique({
      where: { id: productId },
      include: { produitLocation: true },
    });

    if (!produit) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase non initialisé" });
    }

    // Supprimer les images dans Supabase
    if (produit.images && produit.images.length > 0) {
      const deleteResults = await Promise.allSettled(
        produit.images.map(async (url) => {
          try {
            const filePath = url.split("/Produits/")[1];
            if (!filePath) return;

            const { error } = await supabaseAdmin!.storage.from("Produits").remove([filePath]);
            if (error) throw new Error(error.message);
          } catch (err) {
            console.error("Erreur suppression image :", err);
          }
        })
      );

      const failedCount = deleteResults.filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} image(s) n'ont pas pu être supprimée(s) du bucket Supabase.`);
      }
    }

    // 🔹 Supprimer la location associée (si c’est un produit de location)
    if (produit.isLocation && produit.produitLocation) {
      await prisma.produitLocation.delete({
        where: { produitId: produit.id },
      });
      console.log(`ProduitLocation liée supprimée pour le produit ${produit.id}`);
    }

    // Supprimer le produit en base
    await prisma.produit.delete({
      where: { id: productId },
    });

    return res.status(200).json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    console.error("Erreur deleteProduct:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression du produit" });
  }
};

// modification
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { nom, prix, stock, categorieId, tags, description, poids, dimensions, materiaux, images: imagesEnvoyeesJson, statut, typePrix, caution, duree_min, lieuRecup } = req.body;

    if (!productId || !nom || !prix || !categorieId || !description) {
      return res.status(400).json({ error: "Certains champs obligatoires sont manquants." });
    }

    // Vérifier si le produit existe
    const produit = await prisma.produit.findUnique({
      where: { id: productId },
      include: {
        magasin: { include: { proprietaire: true } },
        produitLocation: true,
      },
    });

    if (!produit) return res.status(404).json({ error: "Produit introuvable." });
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase non initialisé." });

    const oldImages = produit.images || [];

    const imagesEnvoyees = imagesEnvoyeesJson ? JSON.parse(imagesEnvoyeesJson) : [];

    // 🔹 Déterminer les images supprimées
    const imagesASupprimer = oldImages.filter((img) => !imagesEnvoyees.includes(img));

    // 🔹 Supprimer les images retirées du front
    if (imagesASupprimer.length > 0) {
      const deleteResults = await Promise.allSettled(
        imagesASupprimer.map(async (url) => {
          const filePath = url.split("/Produits/")[1];
          if (!filePath) return;

          const { error } = await supabaseAdmin!.storage.from("Produits").remove([filePath]);
          if (error) throw new Error(error.message);
        })
      );

      const failedCount = deleteResults.filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} image(s) n'ont pas pu être supprimée(s) du bucket Supabase.`);
      }
    }

    // 🔹 Upload des nouvelles images (si présentes)
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    const newImageUrls: string[] = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      const commercant = produit.magasin.proprietaire;

      if (!commercant) return res.status(404).json({ error: "Commerçant introuvable" });

      const nomMagasin = produit.magasin.nom_Magasin
        .replace(/\s+/g, "_")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      let fileCounter = oldImages.length + 1;

      for (const file of uploadedFiles) {
        const ext = path.extname(file.originalname).toLowerCase();
        const cleanName = nom
          .replace(/\s+/g, "_")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]/g, "");
        const uniqueId = Date.now();
        const suffix = produit.isLocation ? "_Location" : "";
        const fileName = `${cleanName}_${uniqueId}${suffix}_${fileCounter}${ext}`;
        const filePath = `${nomMagasin}_${produit.magasin.proprietaire.id}/${fileName}`;

        const { error: uploadError } = await supabaseAdmin!.storage
          .from("Produits")
          .upload(filePath, fs.createReadStream(file.path), {
            cacheControl: "3600",
            upsert: true,
            contentType: file.mimetype,
            duplex: "half" as any,
          });

        if (uploadError) throw new Error(`Erreur upload Supabase: ${uploadError.message}`);

        const { data: publicUrlData } = supabaseAdmin!.storage
          .from("Produits")
          .getPublicUrl(filePath);

        newImageUrls.push(publicUrlData.publicUrl);
        fs.unlinkSync(file.path);
      }
    }

    // 🔹 Fusion finale : anciennes images gardées + nouvelles images uploadées
    const finalImages = [...imagesEnvoyees, ...newImageUrls];

    // 🔹 Mise à jour du produit
    const updatedProduct = await prisma.produit.update({
      where: { id: productId },
      data: {
        nom,
        prix: parseFloat(prix),
        categorieId,
        tags: tags ? tags.split(",") : [],
        descriptions: description,
        images: finalImages,
        ...(statut && { statut }),
        ...(produit.isLocation
          ? {
              // Pour les locations, pas besoin des champs physiques
              stock: 1,
              poids: 0,
              dimensions: "",
              materiaux: "",
            }
          : {
              // Pour les ventes
              stock: parseInt(stock || "0"),
              poids: parseInt(poids || "0"),
              dimensions,
              materiaux,
            }),
      },
    });

    // --- 🔸 Mise à jour produitLocation si location ---
    if (produit.isLocation && produit.produitLocation) {
      await prisma.produitLocation.update({
        where: { produitId: produit.id },
        data: {
          ...(typePrix && { typePrix }),
          ...(caution && { caution: parseFloat(caution) }),
          ...(duree_min && { duree_min: parseInt(duree_min) }),
          ...(lieuRecup && { lieuRecup }),
        },
      });
    }

    const updatedLocation = produit.isLocation
      ? await prisma.produitLocation.findUnique({ where: { produitId: produit.id } })
      : null;
    
    
    const mappedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.nom,
      price: updatedProduct.prix,
      stock: updatedProduct.stock,
      category: updatedProduct.categorieId,
      images: updatedProduct.images,
      tags: updatedProduct.tags,
      description: updatedProduct.descriptions,
      weight: updatedProduct.poids,
      dimensions: updatedProduct.dimensions,
      materials: updatedProduct.materiaux,
      status: updatedProduct.statut,
      commercantId: produit.magasin.proprietaire.id,
      createdAt: updatedProduct.createdAt,
      locationDetails: updatedLocation
        ? {
            caution: updatedLocation.caution,
            duree_min: updatedLocation.duree_min,
            disponible: updatedLocation.disponible,
            typePrix: updatedLocation.typePrix,
            lieuRecup: updatedLocation.lieuRecup,
          }
        : null,
    };

    return res.status(200).json({
      message: " Produit modifié avec succès",
      produit: mappedProduct,
    });
  } catch (error) {
    console.error("Erreur updateProduct:", error);
    return res.status(500).json({ error: "Erreur interne lors de la modification du produit." });
  }
};

export const searchProductsbyCommercant = async (req: Request, res: Response) => {
  try {
    const { commercantId } = req.params;
    const { status, categoryId, query, isLocation } = req.body; 

    if (!commercantId) return res.status(400).json({ error: "ID du commerçant requis" });

    // Construire la condition where
    const whereClause: any = {
      magasin: { id_proprietaire: commercantId }, // filtrer par commerçant via le magasin
    };

    if (status) whereClause.statut = status;
    if (categoryId) whereClause.categorieId = categoryId;
    if (typeof isLocation === "boolean") whereClause.isLocation = isLocation;

    if (query) {
      whereClause.OR = [
        { nom: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { has: query } },
      ];
    }

    const produits = await prisma.produit.findMany({
      where: whereClause,
      include: { magasin: true, produitLocation: true },
      orderBy: { createdAt: "asc" },
    });

    const mappedProducts = produits.map(p => ({
      id: p.id,
      name: p.nom,
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
      commercantId: p.magasin.id_proprietaire,
      createdAt: p.createdAt,
      typeProduit: p.isLocation ? "location" : "vente",
      locationDetails: p.produitLocation
        ? {
            caution: p.produitLocation.caution,
            duree_min: p.produitLocation.duree_min,
            disponible: p.produitLocation.disponible,
            typePrix: p.produitLocation.typePrix,
            lieuRecup: p.produitLocation.lieuRecup,
          }
        : null,
    }));

    return res.status(200).json(mappedProducts);
  } catch (error) {
    console.error("Erreur searchProducts:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche de produits" });
  }
};


export const createLocation = async (req: Request, res: Response) => {

  try {
    const { nom, prix, categorieId, commercantId, tags, description, statut, caution, duree_min, lieuRecup, typePrix } = req.body;

    if ( !nom || !prix || !categorieId || !tags || !commercantId || !description || !statut || !caution || !duree_min || !lieuRecup|| !typePrix ) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    const commercant = await prisma.utilisateur.findUnique({
      where: { id: commercantId },
      include: { magasins: true }
    });

    if (!commercant) {
      return res.status(404).json({ error: "Commerçant introuvable" });
    }

    if (!commercant.magasins || commercant.magasins.length === 0) {
      return res.status(400).json({ error: "Le vendeur n'a pas de magasin" });
    }

    const magasin = commercant.magasins[0];
    const magasinId = magasin.id_magasin;
    const nomEntreprise = magasin.nom_Magasin
      .replace(/\s+/g, "_")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // envoie de l'img dans supabase
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    const imageUrls: string[] = [];

    if (uploadedFiles && uploadedFiles.length > 0) {
      const uploadResults = await Promise.allSettled(
        uploadedFiles.map(async (file, i) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanName = nom
            .replace(/\s+/g, "_")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]/g, "");
          const uniqueId = Date.now();
          const fileName = `${cleanName}_${uniqueId}_Location${i + 1}${ext}`;
          const filePath = `${nomEntreprise}_${commercantId}/${fileName}`;

          const { error: uploadError } = await supabaseAdmin!.storage
            .from("Produits")
            .upload(filePath, fs.createReadStream(file.path), {
              cacheControl: "3600",
              upsert: true,
              contentType: file.mimetype,
              duplex: "half" as any,
            });

          fs.promises.unlink(file.path); // Supprime le fichier temporaire local

          if (uploadError) throw new Error(uploadError.message);

          const { data: publicUrlData } = supabaseAdmin!.storage
            .from("Produits")
            .getPublicUrl(filePath);

          return publicUrlData.publicUrl;
        })
      );

      // 🔹 Récupérer seulement les uploads réussis
      const successfulUploads = uploadResults
        .filter(r => r.status === "fulfilled")
        .map(r => (r as PromiseFulfilledResult<string>).value);

      // 🔹 Log et gestion d’échec partiel
      const failedCount = uploadResults.filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} image(s) non uploadée(s) correctement.`);
      }

      if (successfulUploads.length === 0) {
        return res.status(500).json({ error: "Échec total de l'upload des images" });
      }

      imageUrls.push(...successfulUploads);
    }

    // --- Création du produit principal ---
    const produit = await prisma.produit.create({
      data: {
        nom,
        prix: parseFloat(prix),
        stock: 1, 
        categorieId,
        magasinId,
        images: imageUrls,
        tags: tags ? tags.split(",") : [],
        descriptions: description,
        poids: 0,
        dimensions: "",
        materiaux: "",
        statut,
        isLocation: true, 
      },
    });

    // --- Création du lien ProduitLocation ---
    const location = await prisma.produitLocation.create({
      data: {
        produitId: produit.id,
        caution: parseFloat(caution),
        duree_min: parseInt(duree_min),
        disponible: true,
        typePrix,
        lieuRecup,
      },
    });

    res.status(201).json({
      message: "Produit créé avec succès",
      produit: { ...produit, produitLocation: location },
    });
  } catch (error) {
    console.error("Erreur createProduct:", error);
    res.status(500).json({ error: "Erreur lors de la création du produit" });
  }
};

// produit poulaire /récent pour un vendeur
export const getPopularProducts = async (req: Request, res: Response) => {
  try {
    const { magasinId } = req.params;

    const produits = await prisma.produit.findMany({
      where: { magasinId },
      include: {
        lignePaniers: {
          include: {
            panier: {
              include: { ventes: true }
            }
          }
        },
        Sponsor: true
      }
    });

    // Calcul des ventes validées
    const produitsAvecVentes = produits.map(p => {
      let ventes = 0;

      p.lignePaniers.forEach(lp => {
        const vente = lp.panier.ventes?.[0];
        if (vente && vente.statut === "payé") {
          ventes += lp.quantite;
        }
      });

      return { ...p, ventes };
    });

    // Aucun produit vendu
    if (produitsAvecVentes.every(p => p.ventes === 0)) {
      const recents = produitsAvecVentes
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        .slice(0, 3);

      return res.json({ mode: "recent", products: recents });
    }

    // Classement populaire
    const populaires = produitsAvecVentes
      .sort((a, b) => b.ventes - a.ventes)
      .slice(0, 3);

    return res.json({ mode: "sales", products: populaires });

  } catch (error) {
    console.error("Erreur getPopularProducts:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

// affichage de produit dans admin
export const getAllProductsForAdmin = async (req: Request, res: Response) => {
  try {
    const produits = await prisma.produit.findMany({
      include: {
        produitLocation: true,
        Sponsor: true,
        magasin: {
          include: {
            proprietaire: true
          }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    if (!produits || produits.length === 0) {
      return res.status(200).json([]);
    }

    const mappedProducts = produits.map(p => ({
      id: p.id,
      name: p.nom,
      price: p.prix,
      stock: p.stock,
      category: p.categorieId,
      images: p.images,
      tags: p.tags,
      description: p.descriptions,
      weight: p.poids,
      dimensions: p.dimensions,
      materials: p.materiaux,
      statut: p.statut,
      typeProduit: p.isLocation ? "location" : "vente",
      createdAt: p.createdAt,
      locationDetails: p.produitLocation
        ? {
            caution: p.produitLocation.caution,
            duree_min: p.produitLocation.duree_min,
            disponible: p.produitLocation.disponible,
            typePrix: p.produitLocation.typePrix,
            lieuRecup: p.produitLocation.lieuRecup,
          }
        : null,
      sponsorisé: !!p.Sponsor,
      sponsorStatus: p.Sponsor ? p.Sponsor.statut : null,
      magasin: p.magasin?.nom_Magasin,
      proprietaireEmail: p.magasin?.proprietaire?.email
    }));

    return res.status(200).json(mappedProducts);

  } catch (error) {
    console.error("Erreur getAllProductsForAdmin :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des produits" });
  }
};

// Update du statut (validé / refusé)
export const updateProductStatus = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { statut } = req.body;

    if (!productId || !statut) {
      return res.status(400).json({ error: "ID produit et statut requis." });
    }

    if (!["validé", "refusé", "en_attente"].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide." });
    }

    // Update du statut
    await prisma.produit.update({
      where: { id: productId },
      data: { statut }
    });

    const p = await prisma.produit.findUnique({
      where: { id: productId },
      include: {
        produitLocation: true,
        Sponsor: true,
        magasin: {
          include: {
            proprietaire: true
          }
        }
      }
    });

    if (!p) {
      return res.status(404).json({ error: "Produit introuvable après mise à jour." });
    }

    const mappedProduct = {
      id: p.id,
      name: p.nom,
      price: p.prix,
      stock: p.stock,
      category: p.categorieId,
      images: p.images,
      tags: p.tags,
      description: p.descriptions,
      weight: p.poids,
      dimensions: p.dimensions,
      materials: p.materiaux,
      statut: p.statut,
      typeProduit: p.isLocation ? "location" : "vente",
      createdAt: p.createdAt,
      locationDetails: p.produitLocation
        ? {
            caution: p.produitLocation.caution,
            duree_min: p.produitLocation.duree_min,
            disponible: p.produitLocation.disponible,
            typePrix: p.produitLocation.typePrix,
            lieuRecup: p.produitLocation.lieuRecup,
          }
        : null,
      sponsorisé: !!p.Sponsor,
      sponsorStatus: p.Sponsor ? p.Sponsor.statut : null,
      magasin: p.magasin?.nom_Magasin,
      proprietaireEmail: p.magasin?.proprietaire?.email
    };

    return res.status(200).json({
      message: "Statut mis à jour avec succès.",
      produit: mappedProduct
    });

  } catch (error) {
    console.error("Erreur updateProductStatus:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la mise à jour du statut." });
  }
};