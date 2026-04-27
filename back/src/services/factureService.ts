import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export type FactureData = {
  factureNumero: string;
  date: Date;
  client: {
    nom: string;
    email: string;
    tel: string;
    adresse: string;
  };
  lignes: Array<{
    nom: string;
    quantite: number;
    prix_Unitaire: number;
    total: number;
  }>;
  frais_livraison: number;
  total: number;
  statutPaiement: string; // "payé", "en attente", etc.
};

// ✅ format Ar insécable => pas de coupure
const fmtAr = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    useGrouping: true,
  })
    .format(Math.round(n))
    .replace(/\s/g, "\u00A0");

export async function generateFacturePDF(data: FactureData) {
  const folder = path.join(process.cwd(), "src", "public", "factures");
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const filename = `Facture-${data.factureNumero}-${data.date
    .toISOString()
    .split("T")[0]}.pdf`;
  const filePath = path.join(folder, filename);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x0 = doc.page.margins.left;
  const isPaid = data.statutPaiement?.toLowerCase() === "payé";

  // --- HEADER ---
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("FACTURE", x0, doc.y, { width: pageWidth, align: "center" });

  doc.moveDown();
  doc.fontSize(12).font("Helvetica");
  doc.text(`Facture n° : ${data.factureNumero}`, x0, doc.y, {
    width: pageWidth,
  });
  doc.text(`Date : ${data.date.toLocaleDateString("fr-FR")}`, x0, doc.y, {
    width: pageWidth,
  });

  doc.moveDown(1.5);

  // --- CLIENT ---
  doc.fontSize(14).font("Helvetica-Bold").text("Informations client", x0);
  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(data.client.nom, x0)
    .text(data.client.email, x0)
    .text(data.client.tel, x0)
    .text(data.client.adresse, x0);

  doc.moveDown(1.5);

  // --- TABLE ---
  doc.font("Helvetica-Bold").fontSize(14).text("Détails de la commande", x0);
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const rowH = 22;

  const colWidths = {
    article: pageWidth * 0.55,
    qte: pageWidth * 0.12,
    prix: pageWidth * 0.16,
    total: pageWidth * 0.17,
  };

  const colX = {
    article: x0,
    qte: x0 + colWidths.article,
    prix: x0 + colWidths.article + colWidths.qte,
    total: x0 + colWidths.article + colWidths.qte + colWidths.prix,
  };

  const drawRow = (
    y: number,
    cells: { article: string; qte: string; prix: string; total: string },
    isHeader = false
  ) => {
    doc
      .lineWidth(1)
      .strokeColor("#d1d5db")
      .rect(x0, y, pageWidth, rowH)
      .stroke();

    // lignes verticales
    doc
      .moveTo(colX.qte, y)
      .lineTo(colX.qte, y + rowH)
      .stroke();
    doc
      .moveTo(colX.prix, y)
      .lineTo(colX.prix, y + rowH)
      .stroke();
    doc
      .moveTo(colX.total, y)
      .lineTo(colX.total, y + rowH)
      .stroke();

    doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(11);

    doc.text(cells.article, colX.article + 5, y + 6, {
      width: colWidths.article - 10,
      align: "left",
      lineBreak: false,
    });
    doc.text(cells.qte, colX.qte + 5, y + 6, {
      width: colWidths.qte - 10,
      align: "right",
      lineBreak: false,
    });
    doc.text(cells.prix, colX.prix + 5, y + 6, {
      width: colWidths.prix - 10,
      align: "right",
      lineBreak: false,
    });
    doc.text(cells.total, colX.total + 5, y + 6, {
      width: colWidths.total - 10,
      align: "right",
      lineBreak: false,
    });
  };

  // header row
  drawRow(
    tableTop,
    {
      article: "Article",
      qte: "Qté",
      prix: "Prix U.",
      total: "Total",
    },
    true
  );

  let y = tableTop + rowH;

  // rows produits
  for (const l of data.lignes) {
    drawRow(y, {
      article: l.nom,
      qte: `x${l.quantite}`,
      prix: `${fmtAr(l.prix_Unitaire)} Ar`,
      total: `${fmtAr(l.total)} Ar`,
    });
    y += rowH;
  }

  doc.y = y + 12;

  // --- FRAIS LIVRAISON ---
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(`Frais de livraison : ${fmtAr(data.frais_livraison)} Ar`, x0, doc.y, {
      width: pageWidth,
      align: "right",
    });

  doc.moveDown(1.5);

  // --- TOTAL ---
  const labelTotal = isPaid ? "TOTAL PAYÉ" : "TOTAL À PAYER";

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(`${labelTotal} : ${fmtAr(data.total)} Ar`, x0, doc.y, {
      width: pageWidth,
      align: "right",
    });

  // --- TEXTE BAS DE PAGE SI PAYÉ ---
  doc.moveDown(2);
  if (isPaid) {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#000000")
      .text(
        "Facture réglée en ligne via Stripe. Aucun autre paiement ne vous sera demandé.",
        x0,
        doc.y,
        { width: pageWidth, align: "left" }
      )
      .fillColor("#000000");
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { filePath, publicUrl: `/factures/${filename}` };
}
