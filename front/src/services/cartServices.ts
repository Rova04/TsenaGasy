// front/src/services/cartServices.ts

import axios from "axios";
import { API_BASE_URL } from "../config/api";

// Types utiles (adapte si besoin)
export type CartLine = {
  id: string;
  quantite: number;
  prix_Unitaire: number;
  total: number;
  idProduit: string;
  produit: any; // tu peux typer plus finement plus tard
};

export type Cart = {
  id: string;
  idClient: string;
  lignes: CartLine[];
};

export async function getCartApi(userId: string): Promise<Cart> {
  const res = await axios.get(`${API_BASE_URL}/api/getPanierByUser/${userId}`);
  return res.data; // le back renvoie le panier complet
}

export async function addToCartApi(
  userId: string,
  produitId: string,
  qty = 1
): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/addPanier/${userId}`, {
        produitId,
        qty,
    });
}

export async function updateLineQtyApi(userId: string, produitId: string, qty: number) {
  const res = await axios.put(`${API_BASE_URL}/api/updatePanier/${userId}`, {
    produitId,
    qty,
  });
  return res.data.panier;
}

export async function removeLineApi(
  userId: string,
  lineId: string
): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/removeLine/${userId}/${lineId}`);
}
