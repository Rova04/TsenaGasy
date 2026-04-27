import React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogContentWide } from "./ui/dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { StatusBadge } from "../components/StatusBadge";

interface ViewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  categories: { id: string; nom: string }[];
}

export const ViewProductModal: React.FC<ViewProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories
}) => {
  if (!product) return null;

  const categoryName = categories.find(c => c.id === product.category)?.nom;

  const isLocation = product.typeProduit === "location";
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 🔹 Modal avec border-radius et bordure visible comme dans ModifyProductModal */}
      <DialogContentWide className="max-w-3xl bg-white rounded-3xl shadow-lg px-10 py-8 border border-gray-200 overflow-y-auto" style={{ borderRadius: "8px" }}>
        
        {/* 🔹 Titre vert */}
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-700 mb-4">
            {product.nom}
          </DialogTitle>
        </DialogHeader>

        {/* 🔹 Description */}
        {product.description && (
          <p className="text-gray-800 text-lg leading-relaxed mb-1 font-medium">
            {product.description}
          </p>
        )}

        {/* 🔹 Tags bleus */}
        {product.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {product.tags.map((tag: string, index: number) => (
              <span key={index} className="text-blue-600 text-sm font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 🔹 Images */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {(product.images || [product.image]).map((img: string, index: number) => (
            <div
              key={index}
              className="aspect-square w-24 rounded-lg border border-gray-200 bg-gray-50 shadow-sm overflow-hidden flex items-center justify-center"
            >
              <ImageWithFallback
                src={img}
                alt={`${product.nom}-${index}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* 🔹 Infos principales sur 2 lignes */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          {!isLocation && (
            <>
              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-900">Prix :</span>
                <span>{new Intl.NumberFormat("mg-MG").format(product.price)} Ar</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-900">Stock :</span>
                <span>{product.stock || "—"}</span>
              </div>
            </>
          )}

          <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
            <span className="font-medium text-gray-900">Catégorie :</span>
            <span>{categoryName}</span>
          </div>

          <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
            <span className="font-medium text-gray-900">Statut :</span>
            <span>{product.status}</span>
          </div>

          <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
            <span className="font-medium text-gray-900">Sponsorisé :</span>
            <span>{product.sponsorStatus === "validé"
              ? "Oui"
              : product.sponsorStatus === "en_attente"
              ? "En attente"
              : "Non"}
            </span>
          </div>

          <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
            <span className="font-medium text-gray-900">Type :</span>
            <span className="capitalize">
              {<StatusBadge status={product.typeProduit === "location" ? "Location" : "Vente"}/>}
            </span>
          </div>

          {/* 🟦 Si LOCATION */}
          {isLocation && (
            <>
              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-900">Tarif :</span>
                <span>{new Intl.NumberFormat("mg-MG").format(product.price)}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-900">Caution :</span>
                <span>
                  {new Intl.NumberFormat("mg-MG").format(product.locationDetails?.caution || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-900">Période :</span>
                <span>{product.locationDetails?.typePrix || "—"}</span>
              </div>

              {product.locationDetails?.duree_min && (
                <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md">
                  <span className="font-medium text-gray-900">Durée minimale :</span>
                  <span>{product.locationDetails.duree_min} jour(s)</span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContentWide>
    </Dialog>
  );
};
