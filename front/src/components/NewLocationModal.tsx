// front/src/components/NewLocationModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Upload, DollarSign, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContentWide } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import { AuthStorage } from "../config/authStorage";
import { toast } from "sonner";

interface NewLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: any) => void;
  categories: { id: string; nom: string }[];
}

const currentUser = AuthStorage.getUser();

export function NewLocationModal({ isOpen, onClose, onSave, categories }: NewLocationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    price: '',
    category: '',
    images: [] as (File | string)[],
    caution: '',
    duree_min: '',
    typePrix: 'journalier',
    lieuRecup: ''
  });

  const [dragActive, setDragActive] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        tags: '',
        price: '',
        category: '',
        images: [],
        caution: '',
        duree_min: '',
        typePrix: 'journalier',
        lieuRecup: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (files: FileList | null) => {
    if (formData.images.length >= 5) return;
    if (files) {
      if (formData.images.length + files.length > 5) {
        alert("Vous pouvez télécharger maximum 5 images.");
        return;
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...Array.from(files)]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (formData.images.length >= 5) return;
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleSubmit = async (e: React.FormEvent, statut: "brouillon" | "en_attente") => {
    e.preventDefault();

    if (statut === "brouillon") setSavingDraft(true);
    else setPublishing(true);

    try {
      // Étape 1 : création du produit (de base)
      const fd = new FormData();
      fd.append("nom", formData.name);
      fd.append("description", formData.description);
      fd.append("prix", formData.price);
      fd.append("categorieId", formData.category);
      fd.append("commercantId", currentUser?.id || "");
      fd.append("isLocation", "true");
      fd.append("caution", formData.caution);
      fd.append("duree_min", formData.duree_min);
      fd.append("typePrix", formData.typePrix);
      fd.append("statut", statut);
      fd.append("tags", formData.tags);
      fd.append("lieuRecup", formData.lieuRecup);

      formData.images.forEach((file: any) => fd.append("images", file));

      const res = await axios.post(`${API_BASE_URL}/addProductLocation`, fd, {
        headers: { Authorization: `Bearer ${AuthStorage.getToken()}` },
      });

      onSave(res.data);
      toast.success(
        statut === "brouillon"
          ? "Location sauvegardée en brouillon"
          : "Location soumise, en attente de validation"
      );

      setFormData({
        name: "",
        description: "",
        tags: '',
        price: "",
        category: "",
        images: [],
        caution: "",
        duree_min: "",
        typePrix: "journalier",
        lieuRecup: ''
      });
      onClose();
    } catch (err) {
      console.error("Erreur lors de la création de la location :", err);
      toast.error("Erreur lors de l'ajout de la location");
    } finally {
      if (statut === "brouillon") setSavingDraft(false);
      else setPublishing(false);
    }
  };

  const isFormValid =
    formData.name &&
    formData.description &&
    formData.price &&
    formData.category &&
    formData.caution &&
    formData.duree_min &&
    formData.images.length > 0 &&
    formData.lieuRecup;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContentWide className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#2D8A47]">Nouvelle Location</DialogTitle>
          <DialogDescription>Ajoutez un produit ou service à louer sur Tsena.mg</DialogDescription>
        </DialogHeader>

        <form className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la location</Label>
                <Input
                  id="name"
                  placeholder="Ex: Tente de camping"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre produit à louer..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                <Input
                  id="tags"
                  placeholder="ex : tente, camping, plein air"
                  value={formData.tags || ""}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix ({formData.typePrix})</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      type="number"
                      placeholder="15000"
                      className="pl-10"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="typePrix">Type de prix</Label>
                  <Select
                    value={formData.typePrix}
                    onValueChange={(v: string) => handleInputChange('typePrix', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type de durée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="journalier">Journalier</SelectItem>
                      <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caution">Caution (Ar)</Label>
                  <Input
                    id="caution"
                    type="number"
                    placeholder="100000"
                    value={formData.caution}
                    onChange={(e) => handleInputChange('caution', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="duree_min" className="whitespace-nowrap">
                        Durée min (jours)
                    </Label>
                    <Input
                        id="duree_min"
                        type="number"
                        placeholder="1"
                        value={formData.duree_min}
                        onChange={(e) => handleInputChange('duree_min', e.target.value)}
                        className="full"
                    />
                  </div>
                </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Images de la location (max. 5)</Label>
                <Card
                  className={`border-2 border-dashed transition-colors ${
                    dragActive ? 'border-[#2D8A47] bg-green-50' : 'border-gray-300'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <div className="text-sm text-gray-600 mb-4">
                        Glissez-déposez vos images ici ou{' '}
                        {formData.images.length < 5 ? (
                          <label className="text-[#2D8A47] cursor-pointer hover:underline">
                            parcourez
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e.target.files)}
                            />
                          </label>
                        ) : (
                          <p className="text-red-500 text-sm mt-2">⚠️ Quota de 5 images atteint</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG jusqu’à 5MB chacune (max. 5 images)</p>
                    </div>
                    {formData.images.length === 0 && (
                      <p className="text-red-500 text-sm mt-1">
                        ⚠️ Ajoutez au moins une image pour pouvoir publier la location.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {formData.images.map((image, index) => {
                  const src = typeof image === "string" ? image : URL.createObjectURL(image);
                  return (
                    <div key={index} className="relative">
                      <img src={src} alt={`Location ${index + 1}`} className="w-full h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                </div>
                          
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: string) => handleInputChange('category', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger>
                    <SelectContent>
                        {categories.length > 0 ? (
                        categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.nom}</SelectItem>
                        ))
                        ) : (
                        <p className="text-sm text-gray-400 px-2">Aucune catégorie</p>
                        )}
                    </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lieuRecup">Lieu de récupération</Label>
                <Input
                  id="lieuRecup"
                  placeholder="ex : Talatamaty - Antananarivo"
                  value={formData.lieuRecup || ""}
                  onChange={(e) => handleInputChange("lieuRecup", e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Spécifiez le lieu où le produit sera récupéré.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e: any) => handleSubmit(e as any, "brouillon")}
              disabled={!isFormValid || savingDraft || publishing}
            >
              {savingDraft ? "Sauvegarde..." : "Sauvegarder en brouillon"}
            </Button>
            <Button
              type="submit"
              className="bg-[#2D8A47] hover:bg-[#245A35]"
              disabled={!isFormValid || savingDraft || publishing}
              onClick={(e: any) => handleSubmit(e as any, "en_attente")}
            >
              {publishing ? "Publication..." : "Publier la location"}
            </Button>
          </div>
        </form>
      </DialogContentWide>
    </Dialog>
  );
}
