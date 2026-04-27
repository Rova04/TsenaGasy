// front/src/components/CartModal.tsx

import React, { useEffect } from "react";
import { CartCheckout } from "./CartCheckout";
import { UserData } from "../config/authStorage";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserData;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, currentUser }) => {
  // bloque le scroll du body quand modal ouvert
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
        style={{
          width: "92vw",
          maxWidth: 1100,
          maxHeight: "88vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative px-6 py-4 border-b border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Fermer"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#2D8A47]">
              Mon panier
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Vérifie ta commande avant paiement
            </p>
          </div>
        </div>

        {/* BODY avec scroll interne */}
        <div
          className="w-full bg-gray-50"
          style={{
            maxHeight: "calc(88vh - 80px)",
            overflowY: "auto",
          }}
        >
          {/* ✅ on passe inModal pour enlever le header interne */}
          <CartCheckout onBack={onClose} currentUser={currentUser} inModal />
        </div>
      </div>
    </div>
  );
};
