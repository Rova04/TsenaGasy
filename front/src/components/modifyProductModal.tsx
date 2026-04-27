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

interface ModifyProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedProduct: any) => Promise<void>;
    product: any;
    categories: { id: string; nom: string }[];
}

const currentUser = AuthStorage.getUser();

export function ModifyProductModal({ isOpen, onClose, onSave, product , categories}: ModifyProductModalProps) {
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
    materials: '',
    status: '',
    typeProduit: '', 
    locationDetails: {
      typePrix: '',
      caution: '',
      duree_min: '',
      lieuRecup: ''
    }
  });

  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setFormData({
        name: product.nom || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        stock: product.stock?.toString() || '',
        category: product.category || '',
        images: product.images || [],
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
        weight: product.weight?.toString() || '',
        dimensions: product.dimensions || '',
        materials: product.materials || '',
        status: product.status || '',
        typeProduit: product.typeProduit || 'vente',
        locationDetails: {
          typePrix: product.locationDetails?.typePrix || '',
          caution: product.locationDetails?.caution?.toString() || '',
          duree_min: product.locationDetails?.duree_min?.toString() || '',
          lieuRecup: product.locationDetails?.lieuRecup || ''
        }
      });
    }
  }, [isOpen, product]);


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;

    const totalImages = formData.images.length + files.length;

    if (totalImages > 5) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...Array.from(files)]
    }));
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
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const savechange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
        const fd = new FormData();
        fd.append("nom", formData.name);
        fd.append("description", formData.description);
        fd.append("prix", formData.price);
        fd.append("categorieId", formData.category);
        fd.append("commercantId", currentUser?.id || "");
        fd.append("tags", formData.tags);
      
        // Champs selon type
        if (formData.typeProduit === "location") {
          fd.append("typePrix", formData.locationDetails.typePrix);
          fd.append("caution", formData.locationDetails.caution);
          fd.append("duree_min", formData.locationDetails.duree_min);
          fd.append("lieuRecup", formData.locationDetails.lieuRecup);
        } else {
          fd.append("stock", formData.stock);
          fd.append("poids", formData.weight);
          fd.append("dimensions", formData.dimensions);
          fd.append("materiaux", formData.materials);
        }

        // Anciennes images gardées
        const oldImages = formData.images.filter(img => typeof img === "string");
        fd.append("images", JSON.stringify(oldImages));

        // Nouvelles images uploadées
        formData.images
          .filter(img => img instanceof File)
          .forEach((file: File) => fd.append("images", file));

        const res = await axios.post(
          `${API_BASE_URL}/modifyProduct/${product.id}`, 
          fd,
          {
            headers: {
              Authorization: `Bearer ${AuthStorage.getToken()}`,
              "Content-Type": "multipart/form-data", // obligatoire pour FormData
            },
          }
        );

        onSave(res.data);
        toast.success(" Produit modifié avec succès");

        onClose();
    } catch (err) {
        console.error("Erreur lors de la modification du produit :", err);
        toast.error(" Erreur lors de la modification du produit");
    } finally {
        setSaving(false);
    }
    };

  const publishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);

    try {
      const fd = new FormData();
      fd.append("nom", formData.name);
      fd.append("description", formData.description);
      fd.append("prix", formData.price);
      fd.append("categorieId", formData.category);
      fd.append("commercantId", currentUser?.id || "");
      fd.append("tags", formData.tags);
      fd.append("statut", "en_attente");

      if (formData.typeProduit === "location") {
        fd.append("typePrix", formData.locationDetails.typePrix);
        fd.append("caution", formData.locationDetails.caution);
        fd.append("duree_min", formData.locationDetails.duree_min);
        fd.append("lieuRecup", formData.locationDetails.lieuRecup);
      } else {
        fd.append("stock", formData.stock);
        fd.append("poids", formData.weight);
        fd.append("dimensions", formData.dimensions);
        fd.append("materiaux", formData.materials);
      }

      // Images
      const oldImages = formData.images.filter(img => typeof img === "string");
      fd.append("images", JSON.stringify(oldImages));
      formData.images
        .filter(img => img instanceof File)
        .forEach((file: File) => fd.append("images", file));

      const res = await axios.post(`${API_BASE_URL}/modifyProduct/${product.id}`, fd, {
        headers: {
          Authorization: `Bearer ${AuthStorage.getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });

      onSave(res.data);
      toast.success("Produit publié avec succès 🎉");
      onClose();
    } catch (err) {
      console.error("Erreur lors de la publication :", err);
      toast.error("Erreur lors de la publication du produit");
    } finally {
      setPublishing(false);
    }
  };

  const isFormValid =
    formData.name &&
    formData.description &&
    formData.price &&
    formData.category &&
    (
      formData.typeProduit === "location"
        ? formData.locationDetails.caution &&
          formData.locationDetails.duree_min &&
          formData.locationDetails.lieuRecup
        : formData.stock &&
          formData.weight &&
          formData.dimensions &&
          formData.materials
    );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContentWide className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#2D8A47]">Modifier le produit</DialogTitle>
          <DialogDescription>Modifier le produit dans votre catalogue Tsena.mg</DialogDescription>
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

                {formData.typeProduit === "location" ? (
                  <div className="space-y-2">
                    <Label htmlFor="typePrix">Type de prix</Label>
                    <Select
                      value={formData.locationDetails.typePrix}
                      onValueChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          locationDetails: { ...prev.locationDetails, typePrix: v },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ex: Journalier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="journalier">Journalier</SelectItem>
                        <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                        <SelectItem value="mensuel">Mensuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="stock"
                        type="number"
                        placeholder="10"
                        className="pl-10"
                        value={formData.stock}
                        onChange={(e) => handleInputChange("stock", e.target.value)}
                      />
                    </div>
                  </div>
                )}
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

              {formData.typeProduit === "location" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="caution">Caution (Ar)</Label>
                      <Input id="caution" type="number" placeholder="100000" value={formData.locationDetails.caution} onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          locationDetails: { ...prev.locationDetails, caution: e.target.value }
                        }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duree_min">Durée min (jours)</Label>
                      <Input id="duree_min" type="number" placeholder="1" value={formData.locationDetails.duree_min} onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          locationDetails: { ...prev.locationDetails, duree_min: e.target.value }
                        }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lieuRecup">Lieu de récupération</Label>
                    <Input id="lieuRecup" placeholder="Ex: Analakely - Antananarivo" value={formData.locationDetails.lieuRecup} onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        locationDetails: { ...prev.locationDetails, lieuRecup: e.target.value }
                      }))} />
                  </div>
                </>
              ) : (
                <>
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
                    <Input id="materials" placeholder="Coton, raphia..." value={formData.materials} onChange={(e) => handleInputChange('materials', e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-[#2D8A47] hover:bg-[#245A35]"
              onClick={(e: any) => savechange(e as any)}>
              {saving ? (
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
                  Envoi en cours...
                </>
              ) : (
                "Enregistrer le produit"
              )}
            </Button>

            {formData.status === "brouillon" && (
              <Button
                type="button"
                variant="outline"
                className="border-[#2D8A47] text-[#2D8A47] transition-all duration-200 hover:text-[#256d3b] hover:shadow-md active:text-[#3EBE64]"
                onClick={(e: any) => publishProduct(e as any)}
                disabled={ saving || publishing}
              >
                {publishing ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-[#2D8A47]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h4a8 8 0 01-8 8v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                      ></path>
                    </svg>
                    Publication en cours...
                  </>
                ) : (
                  "Publier le produit"
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContentWide>
    </Dialog>
  );
}
