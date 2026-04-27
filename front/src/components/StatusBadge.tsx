import React from "react";

interface StatusBadgeProps {
  status?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (!status) {
    return (
      <span
        style={{ backgroundColor: "#D1D5DB", color: "#111827" }} // gris
        className="inline-block px-2 py-1 text-xs font-medium rounded-full border"
      >
        Inconnu
      </span>
    );
  }

  const normalized = status.trim().toLowerCase();
  let label = "";
  let bgColor = "";
  let textColor = "";
  let borderColor = "";

  switch (normalized) {
    case "en_attente":
    case "en attente":
      label = "En attente";
      bgColor = "#FFA726"; // orange
      textColor = "#7C2D12"; 
      borderColor = "#EA580C";
      break;
    case "actif":
      label = "Actif";
      bgColor = "#BBF7D0";   // vert très clair
      textColor = "#166534"; // vert foncé
      borderColor = "#22C55E";
      break;
    case "brouillon":
    case "inactif":
      label = normalized === "brouillon" ? "Brouillon" : "Inactif";
      bgColor = "#D1D5DB"; // gris
      textColor = "#374151";
      borderColor = "#9CA3AF";
      break;
    case "publié":
    case "publie":
    case "approuvé":
    case "approuve":
    case "terminé":
    case "termine":
    case "validé":
    case "valide":
      label =
        normalized === "publié" || normalized === "publie"
        ? "Publié"
        : normalized === "approuvé" || normalized === "approuve"
        ? "Approuvé"
        : normalized.startsWith("valid")
        ? "Validé"
        : "Terminé";
      bgColor = "#2D8A47" 
      textColor = "#FFFFFF";
      borderColor = "#245A35";
      break;
    case "processing":
    case "en_preparation":
      label = "En traitement";
      bgColor = "#3B82F6" // bleu vif
      textColor = "#FFFFFF";
      borderColor = "#2563EB";
      break;
    case "expedie":
    case "livré":
      label = normalized === "expedie" ? "Expédié" : "Livré";
      bgColor = "#9F7AEA"; // violet vif
      textColor = "#6B21A8";
      borderColor = "#8B5CF6";
      break;
    case "refusé":
    case "refuse":
    case "annulé":
    case "annule":
      label =
        normalized === "refusé" || normalized === "refuse"
          ? "Refusé"
          : "Annulé";
      bgColor = "#EF4444"; // rouge vif
      textColor = "#FFFFFF";
      borderColor = "#DC2626";
      break;
    case "vente":
      label = "Vente";
      bgColor = "#3B82F6"; // bleu vif
      textColor = "#FFFF";
      borderColor = "#2563EB";
      break;
    case "location":
      label = "Location";
      bgColor = "#06B6D4"; // cyan/turquoise
      textColor = "#FFFF";
      borderColor = "#0891B2";
      break;
    default:
      label = status;
      bgColor = "#D1D5DB";
      textColor = "#374151";
      borderColor = "#9CA3AF";
      break;
  }

  return (
    <span
      style={{ backgroundColor: bgColor, color: textColor, borderColor: borderColor }}
      className="inline-block px-2 py-1 text-xs font-semibold rounded-full border"
    >
      {label}
    </span>
  );
};
