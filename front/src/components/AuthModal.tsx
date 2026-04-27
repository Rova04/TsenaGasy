// front/src/authModal.tsx

import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config/api';
import { toast } from 'sonner';
import { AuthStorage, UserData } from '../config/authStorage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserData) => void;
}

interface ClientFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  location: string;
}

interface ApiSignupResponse {
  token?: string; 
  utilisateur?: { id?: string; email?: string; nom?: string; role?: string }
  message?: string
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserData) => void;  // ✅ directement UserData
}

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ [key: string]: string }>({});
  const [registerErrors, setRegisterErrors] = useState<{ [key: string]: string }>({});
  const [forgotErrors, setForgotErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const resetLoginForm = () => setLoginData({ email: "", password: "" });
  const resetForgotForm = () => setForgotEmail("");

  // Connexion (mode démo simple)
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Inscription
  const [clientData, setClientData] = useState<ClientFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: ''
  });

  // Validations
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhoneMG = (phone: string) => /^(\+261|0)[0-9]{9}$/.test(phone.replace(/\s+/g, ''));

  const resetForms = () => {
    setLoginData({ email: '', password: '' });
    setClientData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      location: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForms();
    resetAllErrors();
    onClose();
  };

  const resetAllErrors = () => {
    setLoginErrors({});
    setRegisterErrors({});
    setForgotErrors({});
  };

  const isRegisterFormFilled =
    clientData.name.trim() &&
    clientData.email.trim() &&
    clientData.password.trim() &&
    clientData.confirmPassword.trim() &&
    clientData.phone.trim() &&
    clientData.location.trim();
  
  useEffect(() => {
    resetForms();
    resetAllErrors();
    if (activeTab === "register") {
    setIsForgotMode(false); 
  }
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("login");   // toujours revenir sur login
      resetForms();
      resetAllErrors();
    }
  }, [isOpen]);
  
  // Connexion
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginErrors({});

    // Validation front avant d’aller au serveur
    if (!loginData.email.trim()) {
      setLoginErrors({ email: "Email requis" });
      setIsLoggingIn(false);
      return;
    }
    if (!isValidEmail(loginData.email)) {
      setLoginErrors({ email: "Email invalide" });
      setIsLoggingIn(false);
      return;
    }
    if (!loginData.password.trim()) {
      setLoginErrors({ password: "Mot de passe requis" });
      setIsLoggingIn(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email: loginData.email.toLowerCase().trim(),
        motDePasse: loginData.password,
      });

      const data = response.data;
      
      const loggedUser: UserData = {
        name: data.utilisateur?.nom ,
        role: (data.utilisateur?.role ) as UserData["role"],
        accessToken: data.token,
        id: data.utilisateur?.id || "",
        email: data.utilisateur?.email,
        magasinId: data.utilisateur?.magasinId || null
      };

      AuthStorage.saveUser(loggedUser);

      const user = AuthStorage.getUser();
      onLogin(loggedUser);
      handleClose();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      const status = error.response?.status;

      if (status === 404) {
        setLoginErrors({ email: "Utilisateur non existant" });
      } else if (status === 401) {
        setLoginErrors({ password: "Mot de passe incorrect" });
      } else {
        setLoginErrors({ general: error.response?.data?.message || "Erreur serveur" });
      }
    } finally {
      setIsLoggingIn(false);
      resetLoginForm();
    }
  };


  // Inscription
 const handleClientSignup = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (isSubmitting) return;
  if (!isRegisterFormFilled) {
    return;
  }

  const newErrors: { [key: string]: string } = {};

  if (!clientData.name.trim()) {
    newErrors.name = "Le nom est requis";
  }
  if (!clientData.email.trim()) {
    newErrors.email = "L'email est requis";
  } else if (!isValidEmail(clientData.email)) {
    newErrors.email = "Adresse email invalide";
  }
  if (!clientData.password) {
    newErrors.password = "Le mot de passe est requis";
  } else if (clientData.password.length < 8) {
    newErrors.password = "Minimum 8 caractères";
  }
  if (!clientData.confirmPassword) {
    newErrors.confirmPassword = "Veuillez confirmer le mot de passe";
  } else if (clientData.password !== clientData.confirmPassword) {
    newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
  }
  if (!clientData.phone.trim()) {
    newErrors.phone = "Le numéro de téléphone est requis";
  } else if (!isValidPhoneMG(clientData.phone)) {
    newErrors.phone = "Format invalide (+261xxxxxxxxx ou 0xxxxxxxxx)";
  }
  if (!clientData.location.trim()) {
    newErrors.location = "La localisation est requise";
  }

  if (Object.keys(newErrors).length > 0) {
    setRegisterErrors(newErrors);
    setIsSubmitting(false);
    return;
  }

  setRegisterErrors({});
  setIsSubmitting(true);
  // Si pas d’erreurs → on envoie
  try {
    const payload = {
      nom: clientData.name.trim(),
      email: clientData.email.toLowerCase().trim(),
      motDePasse: clientData.password,
      tel: clientData.phone.replace(/\s+/g, ""),
      adresse: clientData.location.trim(),
      role: "acheteur",
    };

    const response = await axios.post<ApiSignupResponse>(
      `${API_BASE_URL}/addUser`,
      payload,
      { timeout: 15000 }
    );

    const data = response.data ?? {};

    // ✨ Sauvegarde aussi en storage
    const newUser: UserData = {
    name: clientData.name,
    role: "client",
    accessToken: data.token,   
    id: data.utilisateur?.id || "",
    email: clientData.email.toLowerCase().trim()
  };

    AuthStorage.saveUser(newUser);  
    onLogin(newUser);   
    handleClose();
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    const status = error.response?.status;

    if (status === 409) {
      setRegisterErrors({ email: "Cette adresse email est déjà utilisée" });
    } else {
      setRegisterErrors({ email: error.response?.data?.message || "Erreur serveur" });
    }
  } finally {
    setIsSubmitting(false); // réactive le bouton
  }
 };
  
  // mdp oublié
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotErrors({ email: "Email requis" });
      return;
    }

    setIsSending(true);
    try {
      await axios.post(`${API_BASE_URL}/forgotPassword`, {
        email: forgotEmail.toLowerCase().trim(),
      });
      toast.success("Un email de réinitialisation a été envoyé !");
      setForgotEmail("");
      setIsForgotMode(false); // retour à la connexion
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setForgotErrors({ email: error.response?.data?.message || "Erreur serveur" });
    } finally {
      setIsSending(false);
      resetForgotForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-[#2D8A47]">
            Connexion à Tsena.mg
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Connectez-vous ou créez votre compte pour continuer
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Se connecter</TabsTrigger>
            <TabsTrigger value="register">Créer un compte</TabsTrigger>
          </TabsList>

          {/* CONNEXION */}
          <TabsContent value="login" className="space-y-4 mt-6">
            {!isForgotMode ? (
              // === FORMULAIRE LOGIN NORMAL ===
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="votre@email.com"
                      className="pl-10"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  {loginErrors.email && <p className="text-red-500 text-sm mt-1">{loginErrors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="text-red-500 text-sm mt-1">{loginErrors.password}</p>}
                </div>

                {/* Lien Mot de passe oublié */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { 
                      resetAllErrors();
                      setIsForgotMode(true);
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Bouton Se connecter */}
                <Button type="submit" className="w-full bg-[#2D8A47] hover:bg-[#245A35]">
                  {isLoggingIn ? "Connexion en cours..." : "Se connecter"}
                </Button>
              </form>
            ) : (
              // === FORMULAIRE MOT DE PASSE OUBLIÉ ===
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Votre email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="votre@email.com"
                      className="pl-10"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                  {forgotErrors.email && <p className="text-red-500 text-sm mt-1">{forgotErrors.email}</p>}
                </div>

                <Button type="submit" className="w-full bg-[#2D8A47] hover:bg-[#245A35]">
                  {isSending ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                      onClick={() => { 
                        resetAllErrors();
                        setIsForgotMode(false);
                      }}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    ← Retour à la connexion
                  </button>
                </div>
              </form>
            )}
          </TabsContent>

          {/* INSCRIPTION */}
          <TabsContent value="register" className="space-y-4 mt-6">
            <form onSubmit={handleClientSignup} className="space-y-4">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="client-name">Nom complet </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="client-name"
                    placeholder="Votre nom complet"
                    className="pl-10"
                    value={clientData.name}
                    onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                  {registerErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{registerErrors.name}</p>
                  )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="client-email">Email </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-10"
                    value={clientData.email}
                    onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                {registerErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{registerErrors.email}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="client-phone">Téléphone </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="client-phone"
                    placeholder="+261 34 12 345 67"
                    className="pl-10"
                    value={clientData.phone}
                    onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                {registerErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">{registerErrors.phone}</p>
                )}
              </div>

              {/* Localisation */}
              <div className="space-y-2">
                <Label htmlFor="client-location">Localisation </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="client-location"
                    placeholder="Antananarivo, Madagascar"
                    className="pl-10"
                    value={clientData.location}
                    onChange={(e) => setClientData(prev => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>
                {registerErrors.location && (
                  <p className="text-red-500 text-sm mt-1">{registerErrors.location}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="client-password">Mot de passe </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="client-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={clientData.password}
                    onChange={(e) => setClientData(prev => ({ ...prev, password: e.target.value }))}
                    required
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
                {registerErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{registerErrors.password}</p>
                )}
              </div>

              {/* Confirmation */}
              <div className="space-y-2">
                <Label htmlFor="client-confirm-password">Confirmer le mot de passe </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="client-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={clientData.confirmPassword}
                    onChange={(e) => setClientData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registerErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{registerErrors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#2D8A47] hover:bg-[#245A35] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isRegisterFormFilled || isSubmitting }
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h4a8 8 0 01-8 8v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                      ></path>
                    </svg>
                    Création en cours...
                  </>
                ) : (
                  "Créer mon compte client"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-gray-500 mt-4">
          En créant un compte, vous acceptez nos{' '}
          <button
            className="text-[#2D8A47] hover:underline"
            onClick={() => toast.info("Conditions d'utilisation - Bientôt disponible")}
          >
            Conditions d'utilisation
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
