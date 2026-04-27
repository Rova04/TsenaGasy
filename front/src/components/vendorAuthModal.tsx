// front/src/components/vendorAuthModal.tsx
import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../config/api";
import { AuthStorage, UserData } from "../config/authStorage";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserData) => void;
}

export function VendorAuthModal({ isOpen, onClose, onLogin }: VendorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    businessName: "",
    businessType: "pme",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validations
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhoneMG = (phone: string) => /^(\+261|0)[0-9]{9}$/.test(phone.replace(/\s+/g, ''));

  const isFormValid =
    formData.name.trim() &&
    isValidEmail(formData.email) &&
    isValidPhoneMG(formData.phone) &&
    formData.location.trim() &&
    formData.businessName.trim() &&
    formData.password.length >= 8 &&
    formData.confirmPassword;

  useEffect(() => {
    if (!isOpen) {
      // Le modal vient d’être fermé → on nettoie tout
      setErrors({});
      setFormData({
        name: "",
        email: "",
        phone: "",
        location: "",
        businessName: "",
        businessType: "pme",
        password: "",
        confirmPassword: ""
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const newErrors: { [k: string]: string } = {};

    if (!formData.name.trim()) newErrors.name = "Nom complet requis";
    if (!formData.email.trim()) {
      newErrors.email = "Email requis";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Adresse email invalide";
    }
    if (!formData.password) {
      newErrors.password = "Mot de passe requis";
    } else if (formData.password.length < 8) {
      newErrors.password = "Minimum 8 caractères";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Veuillez confirmer le mot de passe";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Téléphone requis";
    } else if (!isValidPhoneMG(formData.phone)) {
      newErrors.phone = "Format invalide (+261xxxxxxxxx ou 0xxxxxxxxx)";
    }
    if (!formData.location.trim()) newErrors.location = "Localisation requise";
    if (!formData.businessName.trim()) newErrors.businessName = "Nom d’entreprise requis";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        nom: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        motDePasse: formData.password,
        tel: formData.phone.replace(/\s+/g, ""),
        adresse: formData.location.trim(),
        nomEntreprise: formData.businessName.trim(),
        type: formData.businessType,
        role: "commercant",
      };

      const response = await axios.post(`${API_BASE_URL}/addUser`, payload);
      const data = response.data;

      const newUser: UserData = {
        name: formData.name,
        role: "vendor",
        accessToken: data.token,
        id: data.utilisateur?.id || "",
        email: formData.email,
        magasinId: data.utilisateur?.magasinId || null
      };

      AuthStorage.saveUser(newUser);
      onLogin(newUser);

      // if (data.onboardingUrl) {
      //   window.location.href = data.onboardingUrl;
      //   return; // important pour éviter la suite
      // }
      
      setFormData({
        name: "",
        email: "",
        phone: "",
        location: "",
        businessName: "",
        businessType: "pme",
        password: "",
        confirmPassword: ""
      });
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setErrors({ general: error.response?.data?.message || "Erreur serveur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg overflow-auto max-h-[90vh] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2D8A47]">
            Créer un compte vendeur
          </DialogTitle>
          <DialogDescription>
            Rejoignez Tsena.mg et commencez à vendre vos produits en ligne.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignup} className="space-y-8">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" placeholder="Ex: Jean Rakoto"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)} />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2 mt-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="exemple@domaine.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)} />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>

          {/* Téléphone */}
          <div className="space-y-2 mt-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" placeholder="+261 34 12 345 67"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)} />
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
          </div>

          {/* Localisation */}
          <div className="space-y-2 mt-2">
            <Label htmlFor="location">Localisation</Label>
            <Input id="location" placeholder="Antananarivo, Madagascar"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)} />
            {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}
          </div>

          {/* Nom entreprise */}
          <div className="space-y-2 mt-2">
            <Label htmlFor="businessName">Nom du Magasin</Label>
            <Input id="businessName" placeholder="Ex: Boutique TsenaGasy"
              value={formData.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)} />
            {errors.businessName && <p className="text-red-500 text-xs">{errors.businessName}</p>}
          </div>

          {/* Type de commerce */}
          <div className="space-y-2 mt-2">
            <Label>Type de commerce</Label>
            <RadioGroup className="flex flex-col gap-2 p-2 border rounded-md"
              value={formData.businessType}
              onValueChange={(v: any) => handleChange("businessType", v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pme" id="pme" />
                <Label htmlFor="pme">PME</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="freelance" id="freelance" />
                <Label htmlFor="freelance">Freelance</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="particulier" id="particulier" />
                <Label htmlFor="particulier">Particulier</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mot de passe */}
          <div className="space-y-2 mt-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Au moins 8 caractères</p>
            {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
          </div>

          {/* Confirmation */}
          <div className="space-y-2 mt-2">
            <Label htmlFor="confirmPassword">Confirmer mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
          </div>

          {/* Erreur générale */}
          {errors.general && (
            <div className="p-2 bg-red-100 text-red-700 text-sm rounded">
              {errors.general}
            </div>
          )}

          {/* Bouton */}
          <Button type="submit" className="w-full bg-[#2D8A47] py-3 text-lg mt-6" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? "Création en cours..." : "Créer mon compte vendeur"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
