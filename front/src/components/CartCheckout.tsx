import React, { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, ChevronLeft, Truck } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from "sonner";
import { useCart } from "../context/cartContext";
import Swal from "sweetalert2";
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { UserData } from '../config/authStorage';
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

interface CartCheckoutProps {
  onBack: () => void;
  currentUser: UserData;
  inModal?: boolean;
}

const stripePromise = loadStripe("pk_test_51ScVvKA92A38UUOZZyGQLyPdgKtMR3lNvYTWazRkDxVqqhmL54OqaBCBT8ABPPR0aCn4l29juirq9RrZIEJ9XSL900sQsJeh58");

export function CartCheckout({ onBack, currentUser, inModal = false }: CartCheckoutProps) {
  const { cart, loading, error, updateQty, removeFromCart, refreshCart } = useCart();
  const lignes = cart?.lignes ?? [];
  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    district: "",
  });

  const [isOrdering, setIsOrdering] = useState(false);

  const isShippingValid =
    shipping.firstName.trim() &&
    shipping.lastName.trim() &&
    shipping.phone.trim() &&
    shipping.address.trim() &&
    shipping.city.trim() && shipping.district;
  
  // seulement 2 étapes
  const [step, setStep] = useState<'cart' | 'payment' | 'shipping'>('cart');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);


  const formatPrice = (price: number) =>
    new Intl.NumberFormat('mg-MG').format(price) + ' Ar';

  const subtotal = lignes.reduce(
    (sum, line) => sum + Number(line.total),
    0
  );

  // tu peux changer ce calcul plus tard si tu veux un vrai système
  const deliveryFee = subtotal > 100000 ? 0 : 5000;
  const total = subtotal + deliveryFee;

  const handleRemove = async (lineId: string, productName?: string) => {
    const result = await Swal.fire({
      title: "Supprimer cet article ?",
      text: productName
        ? `${productName} sera retiré du panier`
        : "Cet article sera retiré du panier",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2D8A47",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: "Suppression...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await removeFromCart(lineId);

      Swal.fire({
        icon: "success",
        title: "Supprimé !",
        timer: 900,
        showConfirmButton: false,
      });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          e?.response?.data?.error ||
          e?.message ||
          "Impossible de supprimer",
      });
    }
  };

  async function createOrder() {
    if (!cart || lignes.length === 0) throw new Error("Panier vide");
    if (!currentUser?.id) throw new Error("Utilisateur non connecté");

    const adresse_livraison =
      `${shipping.address}, ${shipping.district}, ${shipping.city}`;

    const payload = {
      panierId: cart.id,
      idUser: currentUser.id,
      adresse_livraison,
      contact_phone: shipping.phone,
      mode: "standard",
      frais_livraison: deliveryFee,
      total,
    };

    console.log(payload);
    const { data } = await axios.post(`${API_BASE_URL}/add/order`, payload);
    return data; // venteId etc
  }

  const handlePlaceOrder = async () => {
    if (!isShippingValid) {
      toast.error("Merci de remplir tous les champs obligatoires");
      return;
    }

    setIsOrdering(true);
    try {
      const order = await createOrder();

      console.log("VENTE ID =", order.venteId);

    const { data } = await axios.post(
      `${API_BASE_URL}/payments/create-checkout-session`,
      { orderId: order.venteId }
    );

    if (!data.clientSecret) {
      throw new Error("clientSecret Stripe manquant");
    }

      setClientSecret(data.clientSecret);
      setStripeSessionId(data.sessionId);
      setStep("payment");

    } catch (e: any) {
      toast.error(e.message || "Erreur création commande");
    } finally {
      setIsOrdering(false);
    }
  };

  
  // 
  // ---------------------------------------
  // ÉTAPE 1 : PANIER
  // ---------------------------------------
  if (step === 'cart') {
    return (
      <div className={inModal ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
        {/* Header seulement si pas en modal */}
        {!inModal && (
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-4">
              <Button variant="ghost" onClick={onBack} className="mb-2">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Continuer les achats
              </Button>
              <h1 className="text-2xl font-bold">
                Mon panier ({lignes.length} articles)
              </h1>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card style={{
                backgroundColor: "rgba(54, 162, 82, 0.1)", // vert clair
                border: "1px solid rgba(45, 138, 71, 0.20)" // bordure verte légère
              }}>
                <CardContent className="p-6">
                  {lignes.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">
                        Votre panier est vide
                      </p>
                      <Button onClick={onBack}>Continuer les achats</Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {lignes.map((line) => {
                        const p = line.produit;
                        const image = p?.images?.[0] ?? "";
                        const magasinNom = p?.magasin?.nom_Magasin ?? "Magasin";
                        const prixUnitaire = Number(line.prix_Unitaire);
                        const totalLigne = Number(line.total);

                        return (
                          <div
                            key={line.id}
                            className="flex gap-4 p-4 border rounded-lg bg-white"
                          >
                            {/* Image produit */}
                            <ImageWithFallback
                              src={image}
                              alt={p.nom}
                              className="w-20 h-20 object-cover rounded"
                            />

                            {/* Infos produit */}
                            <div className="flex-1">
                              {/* nom produit */}
                              <h3 className="font-medium text-gray-900">
                                {p.nom}
                              </h3>

                              {/* nom du magasin (pas vendeur) */}
                              <p className="text-sm text-gray-600">
                                Magasin : {magasinNom}
                              </p>

                              {/* prix unitaire */}
                              <p className="font-bold text-[#2D8A47] mt-1">
                                {formatPrice(prixUnitaire)} / unité
                              </p>

                              {/* total ligne */}
                              <p className="text-sm text-gray-700">
                                Total : {formatPrice(totalLigne)}
                              </p>
                            </div>

                            {/* Quantité */}
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={line.quantite <= 1} // min = 1
                                onClick={() => {
                                  updateQty(line.idProduit, line.quantite - 1);
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>

                              <span className="w-10 text-center font-semibold">
                                {line.quantite}
                              </span>

                              <Button
                                variant="outline"
                                size="sm"
                                 onClick={() => updateQty(line.idProduit, line.quantite + 1)}
                                  disabled={line.quantite >= p.stock}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Supprimer */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(line.id, p?.nom)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Résumé de la commande</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Livraison</span>
                    <span
                      className={
                        deliveryFee === 0 ? 'text-green-600 font-medium' : ''
                      }
                    >
                      {deliveryFee === 0
                        ? 'Gratuit'
                        : formatPrice(deliveryFee)}
                    </span>
                  </div>

                  {deliveryFee === 0 && subtotal > 50000 && (
                    <p className="text-xs text-green-600">
                      🎉 Livraison gratuite appliquée !
                    </p>
                  )}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-[#2D8A47]">
                      {formatPrice(total)}
                    </span>
                  </div>

                  <Button
                    className="w-full bg-[#2D8A47] hover:bg-[#245A35]"
                    onClick={() => setStep('shipping')}
                    disabled={lignes.length === 0}
                  >
                    Passer la commande
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "payment" && clientSecret) {
    return (
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <EmbeddedCheckout/>
      </EmbeddedCheckoutProvider>
    );
  }

  // ---------------------------------------
  // ÉTAPE 2 : ADRESSE LIVRAISON + PAYER
  // ---------------------------------------
  return (
    <div className={inModal ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
      {/* Header seulement si pas en modal */}
      {!inModal && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => setStep('cart')} className="mb-2">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour au panier
            </Button>
            <h1 className="text-2xl font-bold">Adresse de livraison</h1>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulaire adresse */}
          <div className="lg:col-span-2">
            <button
              onClick={() => setStep("cart")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "#2D8A47",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                lineHeight: 1.2,
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Retour au panier
            </button>
            
            <Card>
              <CardContent className="p-6">
                <form className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="block mb-2">Prénom</Label>
                      <Input id="firstName" placeholder="Votre prénom"  value={shipping.firstName}
                        onChange={(e) =>
                          setShipping((s) => ({ ...s, firstName: e.target.value }))
                        }/>
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="block mb-2">Nom</Label>
                      <Input id="lastName" placeholder="Votre nom" value={shipping.lastName}
                        onChange={(e) =>
                          setShipping((s) => ({ ...s, lastName: e.target.value }))
                        }/>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="block mb-2">Téléphone</Label>
                    <Input id="phone" placeholder="+261 xx xxx xx xx" value={shipping.phone}
                      onChange={(e) =>
                        setShipping((s) => ({ ...s, phone: e.target.value }))
                      }/>
                  </div>

                  <div>
                    <Label htmlFor="address" className="block mb-2">Adresse complète</Label>
                    <Input id="address" placeholder="Lot, rue, quartier..." value={shipping.address}
                      onChange={(e) =>
                        setShipping((s) => ({ ...s, address: e.target.value }))
                      }/>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="block mb-2">Ville</Label>
                      <Input id="city" placeholder="Antananarivo" value={shipping.city}
                        onChange={(e) =>
                          setShipping((s) => ({ ...s, city: e.target.value }))
                        }/>
                    </div>
                    <div>
                      <Label htmlFor="district" className="block mb-2">District/Commune</Label>
                      <Input id="district" placeholder="Votre district" value={shipping.district}
                        onChange={(e) =>
                          setShipping((s) => ({ ...s, district: e.target.value }))
                        }/>
                    </div>
                  </div>

                  {/* Pas d’options de livraison, juste un message simple */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center space-x-2 mb-1">
                      <Truck className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        Information livraison
                      </span>
                    </div>

                    <p className="text-sm text-blue-800">
                      Votre colis arrivera entre 1 et 2 semaines selon votre localisation
                      (Antananarivo ou province).
                    </p>

                    <p className="text-xs text-blue-700/80 mt-1">
                      Nos vendeurs expédient généralement sous 24–48h.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Résumé + bouton payer */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Livraison</span>
                    <span>
                      {deliveryFee === 0
                        ? 'Gratuit'
                        : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-[#2D8A47]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* bouton stripe placeholder */}
                <Button
                  className="w-full mt-3 bg-[#2D8A47] hover:bg-[#245A35]"
                  onClick={handlePlaceOrder}
                  disabled={isOrdering}
                >
                  {isOrdering ? "Confirmation de la commande..." : "Confirmer la commande"}
                </Button>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
