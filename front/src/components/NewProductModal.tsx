import React, { useState, useEffect } from 'react';
import { X, Upload, DollarSign, Package, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription , DialogContentWide } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import { AuthStorage } from "../config/authStorage";
import { toast } from "sonner";

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => void;
  categories: { id: string; nom: string }[];
}

const currentUser = AuthStorage.getUser();

export function NewProductModal({ isOpen, onClose, onSave, categories }: NewProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    images: [] as (File | string)[],
    tags: '',
    weight: '',
    dimensions: '',
    materials: ''
  });

  const [dragActive, setDragActive] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        images: [],
        tags: '',
        weight: '',
        dimensions: '',
        materials: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (files: FileList | null) => {
    if (formData.images.length >= 5) {
      return;
    }

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

    // Définir le spinner sur le bouton correspondant
    if (statut === "brouillon") setSavingDraft(true);
    else setPublishing(true);

    try {
      const fd = new FormData();
      fd.append("nom", formData.name);
      fd.append("description", formData.description);
      fd.append("prix", formData.price);
      fd.append("stock", formData.stock);
      fd.append("categorieId", formData.category);
      fd.append("commercantId", currentUser?.id || "");
      fd.append("tags", formData.tags);
      fd.append("poids", formData.weight);
      fd.append("dimensions", formData.dimensions);
      fd.append("materiaux", formData.materials);
      fd.append("statut", statut);

      formData.images.forEach((file: any) => fd.append("images", file));

      const res = await axios.post(`${API_BASE_URL}/addProduct`, fd, {
        headers: { Authorization: `Bearer ${AuthStorage.getToken()}` },
      });

      onSave(res.data);
      toast.success(
        statut === "brouillon"
          ? "Produit sauvegardé en brouillon"
          : "Produit soumis, en attente de validation"
      );

      // Reset du formulaire
      setFormData({
        name: "",
        description: "",
        price: "",
        stock: "",
        category: "",
        images: [],
        tags: "",
        weight: "",
        dimensions: "",
        materials: ""
      });
      onClose();
    } catch (err) {
      console.error("Erreur lors de la création du produit :", err);
      toast.error("Erreur lors de l'ajout du produit");
    } finally {
      if (statut === "brouillon") setSavingDraft(false);
      else setPublishing(false);
    }
  };

  const isFormValid =
    formData.name &&
    formData.description &&
    formData.price &&
    formData.stock &&
    formData.category &&
    formData.weight &&
    formData.dimensions &&
    formData.materials &&
    formData.images.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContentWide className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#2D8A47]">Nouveau produit</DialogTitle>
          <DialogDescription>Ajoutez un nouveau produit à votre catalogue Tsena.mg</DialogDescription>
        </DialogHeader>

        <form className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit</Label>
                <Input id="name" placeholder="Ex: Lamba traditionnel malgache" 
                  value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Décrivez votre produit, ses caractéristiques, son origine..." value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} rows={4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (Ar)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input id="price" type="number" placeholder="0" className="pl-10" value={formData.price} onChange={(e) => handleInputChange('price', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input id="stock" type="number" placeholder="10" className="pl-10" value={formData.stock} onChange={(e) => handleInputChange('stock', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={formData.category} onValueChange={(value: string) => handleInputChange('category', value)}>
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
                <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                <Input id="tags" placeholder="traditionnel, fait main, madagascar" value={formData.tags} onChange={(e) => handleInputChange('tags', e.target.value)} />
              </div>
            </div>

            {/* Images et détails */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Images du produit (max. 5)</Label>
                <Card className={`border-2 border-dashed transition-colors ${dragActive ? 'border-[#2D8A47] bg-green-50' : 'border-gray-300'}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
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
                      <p className="text-xs text-gray-500">PNG, JPG jusqu'à 5MB chacune (max. 5 images)</p>
                    </div>
                    {formData.images.length === 0 && (
                      <p className="text-red-500 text-sm mt-1">
                        ⚠️ Ajoutez au moins une image pour pouvoir publier le produit.
                      </p>
                    )}
                  </CardContent>
                </Card>

                  {formData.images.map((image, index) => {
                    const src = typeof image === "string" ? image : URL.createObjectURL(image);
                    return (
                      <div key={index} className="relative">
                        <img src={src} alt={`Produit ${index + 1}`} className="w-full h-20 object-cover rounded border" />
                        <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}                
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Poids (g)</Label>
                  <Input id="weight" type="number" placeholder="500" value={formData.weight} onChange={(e) => handleInputChange('weight', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions (cm)</Label>
                  <Input id="dimensions" placeholder="30x20x10" value={formData.dimensions} onChange={(e) => handleInputChange('dimensions', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="materials">Matériaux</Label>
                <Input id="materials" placeholder="Coton, raphia, bois de rose..." value={formData.materials} onChange={(e) => handleInputChange('materials', e.target.value)}/>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="button" variant="outline"
              onClick={(e: any) => handleSubmit(e as any, "brouillon")}  disabled={!isFormValid || savingDraft || publishing}>
              {savingDraft ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h4a8 8 0 01-8 8v-4l-3 3 3 3v-4a8 8 0 01-8-8z"></path>
                </svg>
              ) : "Sauvegarder en brouillon"}
            </Button>
            <Button type="submit" className="bg-[#2D8A47] hover:bg-[#245A35]" disabled={!isFormValid || savingDraft || publishing}
              onClick={(e: any) => handleSubmit(e as any, "en_attente")}>
              {publishing ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h4a8 8 0 01-8 8v-4l-3 3 3 3v-4a8 8 0 01-8-8z"></path>
                </svg>
              ) : "Publier le produit"}
            </Button>
          </div>
        </form>
      </DialogContentWide>
    </Dialog>
  );
}
