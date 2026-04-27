// front/src/components/addUserModal.tsx
import React, { useState, useEffect } from "react";
import { X, User, Mail, Phone, MapPin, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../config/api";
import { toast } from "sonner";
import { AuthStorage, UserData } from "../config/authStorage";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (user: UserData) => void;
  role: "client" | "vendor" | "admin"; // rôle choisi
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded, role }) =>{
  const [formData, setFormData] = useState<any>({
    name: "",
    email: "",
    phone: "",
    location: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    businessType: "pme",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        location: "",
        password: "",
        confirmPassword: "",
        businessName: "",
        businessType: "pme",
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhoneMG = (phone: string) => /^(\+261|0)[0-9]{9}$/.test(phone.replace(/\s+/g, ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) newErrors.name = "Nom requis";
    if (!formData.email.trim()) newErrors.email = "Email requis";
    else if (!isValidEmail(formData.email)) newErrors.email = "Email invalide";
    if (!formData.password) newErrors.password = "Mot de passe requis";
    else if (formData.password.length < 8) newErrors.password = "Minimum 8 caractères";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Les mots de passe ne correspondent pas";

    if (role !== "admin") { // client & vendor
      if (!formData.phone.trim()) newErrors.phone = "Téléphone requis";
      else if (!isValidPhoneMG(formData.phone)) newErrors.phone = "Format invalide (+261xxxxxxxxx ou 0xxxxxxxxx)";
      if (!formData.location.trim()) newErrors.location = "Localisation requise";
    }
    if (role === "vendor" && !formData.businessName.trim()) newErrors.businessName = "Nom d'entreprise requis";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        nom: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        motDePasse: formData.password,
        role: role === "client" ? "acheteur" : role === "vendor" ? "commercant" : "admin",
      };
      if (role !== "admin") {
        payload.tel = formData.phone.replace(/\s+/g, "");
        payload.adresse = formData.location.trim();
      }
      if (role === "vendor") {
        payload.nomEntreprise = formData.businessName.trim();
        payload.type = formData.businessType;
      }

      const { data } = await axios.post(`${API_BASE_URL}/addUser`, payload);

      const newUser: UserData = {
        name: formData.name,
        email: formData.email,
        id: data.utilisateur?.id || "",
        role: role,
        accessToken: data.token || "",
      };

      AuthStorage.saveUser(newUser);
      onUserAdded(newUser);
      toast.success("Utilisateur ajouté avec succès !");
      onClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      toast.error(error.response?.data?.message || "Erreur serveur");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#2D8A47]">Créer un {role}</DialogTitle>
          <DialogDescription>
            {role === "client" && "Créez un compte pour acheter vos produits"}
            {role === "vendor" && "Créez un compte pour vendre vos produits"}
            {role === "admin" && "Ajouter un administrateur"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Nom */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Label htmlFor="name">Nom complet </Label>
            <Input
              placeholder="Nom complet"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="pl-10"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Label htmlFor="name">Email </Label>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="pl-10"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Client & Vendor fields */}
          {(role === "client" || role === "vendor") && (
            <>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Téléphone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="pl-10"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Localisation"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="pl-10"
                />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
              </div>
            </>
          )}

          {/* Vendor business */}
          {role === "vendor" && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Label htmlFor="name">Nom de l'entreprise</Label>
              <Input
                placeholder="Nom d'entreprise"
                value={formData.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
                className="pl-10"
              />
              {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
            </div>
          )}

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmer mot de passe"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full bg-[#2D8A47] hover:bg-[#245A35]" disabled={isSubmitting}>
            {isSubmitting ? "Création en cours..." : `Créer ${role}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
