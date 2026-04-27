// back/src/controller/paymentController.ts
import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../config/db";
import { generateFacturePDF } from "../services/factureService";
import { sendFactureEmail } from "../services/mailService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const buildFactureNumero = (venteId: string) => {
    //ex : F-20251208-B1F3C9E2
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const shortId = venteId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `F-${yyyy}${mm}${dd}-${shortId}`;
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId manquant" });

    const vente = await prisma.vente.findUnique({
      where: { id: orderId },
      include: {
        lignes: { include: { produit: true } },
        livraison: true,
      },
    });

    if (!vente) return res.status(404).json({ error: "Commande introuvable" });
    if (!vente.lignes?.length) {
      return res.status(400).json({ error: "Commande sans lignes" });
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      vente.lignes.map((l) => ({
        quantity: l.quantite,
        price_data: {
          currency: "mga",
          unit_amount: Math.round(Number(l.prix_Unitaire)),
          product_data: {
            name: l.produit?.nom || "Produit",
          },
        },
      }));

    const frais = Number(vente.livraison?.frais_livraison || 0);
    if (frais > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "mga",
          unit_amount: Math.round(frais),
          product_data: { name: "Frais de livraison" },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items,
      return_url: `${process.env.FRONT_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      metadata: { orderId: vente.id },
    });

    return res.json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const sessionStatus = async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      return res.status(400).json({ error: "session_id manquant" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.json({
      status: session.status,                 // "open" | "complete"
      payment_status: session.payment_status // "paid" | "unpaid" | "no_payment_required"
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const confirmOrderPayment = async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: "session_id manquant" });
    }

    // 1) Vérifier la session Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.status !== "complete" || session.payment_status !== "paid") {
      return res
        .status(400)
        .json({ error: "Paiement non confirmé par Stripe" });
    }

    const orderId = session.metadata?.orderId as string | undefined;
    if (!orderId) {
      return res.status(400).json({ error: "orderId manquant dans metadata" });
    }

    // 2) Récupérer la vente complète
    const venteFull = await prisma.vente.findUnique({
      where: { id: orderId },
      include: {
        lignes: { include: { produit: true } },
        livraison: true,
        paiement: true,
        user: true,
      },
    });

    if (!venteFull) {
      return res.status(404).json({ error: "Vente introuvable" });
    }

    // Idempotence : si déjà validé, on ne refait rien
    if (venteFull.paiement?.statut === "validé") {
      return res.json({
        message: "Paiement déjà confirmé",
        venteId: venteFull.id,
        facture_url: venteFull.facture_url,
      });
    }

    // 3) Générer numéro de facture
    const factureNumero =
      venteFull.facture_numero || buildFactureNumero(venteFull.id);

    // 4) Générer PDF
    const { filePath, publicUrl } = await generateFacturePDF({
      factureNumero,
      date: venteFull.dateVente,
      client: {
        nom: venteFull.user.nom,
        email: venteFull.user.email,
        tel: venteFull.user.tel,
        adresse: venteFull.livraison?.adresse_livraison || "Adresse non fournie",
      },
      lignes: venteFull.lignes.map((l) => ({
        nom: l.produit.nom,
        quantite: l.quantite,
        prix_Unitaire: Number(l.prix_Unitaire),
        total: Number(l.total),
      })),
      frais_livraison: Number(venteFull.livraison?.frais_livraison || 0),
      total: Number(venteFull.total),

      statutPaiement: "payé"
    });

    // 5) MAJ vente + paiement
    const updated = await prisma.vente.update({
      where: { id: venteFull.id },
      data: {
        statut: "en_preparation",   // ou "payée"
        facture_numero: factureNumero,
        facture_url: publicUrl,
        paiement: {
          update: {
            statut: "validé",
            transaction_id: session.payment_intent as string | null,
          },
        },
      },
      include: { paiement: true, livraison: true, lignes: true },
    });

    // 6) Envoi email (try/catch pour ne pas casser la réponse)
    try {
      const html = `
        <p>Bonjour ${venteFull.user.nom},</p>
        <p>Merci pour votre commande sur TsenaGasy.</p>
        <p>
          Veuillez trouver votre facture en pièce jointe.<br/>
          Elle contient tous les détails relatifs à votre achat, ainsi que le montant total réglé.
        </p>
        <p>Nous restons à votre disposition pour toute question.</p>
        <p>Cordialement,<br/>L’équipe TsenaGasy</p>
      `;

      const text = `Bonjour ${venteFull.user.nom},

Merci pour votre commande sur TsenaGasy.

Veuillez trouver votre facture en pièce jointe.
Elle contient tous les détails relatifs à votre achat, ainsi que le montant total réglé.

Nous restons à votre disposition pour toute question.

Cordialement,
L’équipe TsenaGasy`;

      await sendFactureEmail({
        to: venteFull.user.email,
        subject: `Votre facture ${factureNumero}`,
        text,
        html,
        filePath,
        filename: `${factureNumero}.pdf`,
      });
    } catch (mailErr) {
      console.error("Email facture non envoyé:", mailErr);
    }

    return res.json({
      message: "Paiement confirmé & facture générée",
      venteId: updated.id,
      facture_url: updated.facture_url,
    });

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({
      error: "Erreur serveur confirmOrderPayment",
      detail: e?.message,
    });
  }
};