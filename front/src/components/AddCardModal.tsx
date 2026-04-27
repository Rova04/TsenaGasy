import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { CreditCard, Lock, AlertCircle, Check } from 'lucide-react';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdded: (card: SavedCard) => void;
}

export interface SavedCard {
  id: string;
  lastFour: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
  holderName: string;
  isDefault: boolean;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
  isOpen,
  onClose,
  onCardAdded
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClose = () => {
    if (!isProcessing) {
      setCardNumber('');
      setHolderName('');
      setExpiryMonth('');
      setExpiryYear('');
      setCvv('');
      setSaveCard(true);
      onClose();
    }
  };

  const formatCardNumber = (value: string) => {
    // Supprimer tous les caractères non numériques
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    // Ajouter des espaces tous les 4 chiffres
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const getCardBrand = (number: string) => {
    const cleanNumber = number.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'MasterCard';
    if (/^3[47]/.test(cleanNumber)) return 'American Express';
    if (/^6/.test(cleanNumber)) return 'Discover';
    
    return 'Carte';
  };

  const validateCard = () => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      toast.error('Numéro de carte invalide', {
        description: 'Le numéro de carte doit contenir entre 13 et 19 chiffres.'
      });
      return false;
    }

    if (!holderName.trim()) {
      toast.error('Nom requis', {
        description: 'Veuillez entrer le nom du titulaire de la carte.'
      });
      return false;
    }

    if (!expiryMonth || !expiryYear) {
      toast.error('Date d\'expiration requise', {
        description: 'Veuillez entrer la date d\'expiration complète.'
      });
      return false;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      toast.error('CVV invalide', {
        description: 'Le code CVV doit contenir 3 ou 4 chiffres.'
      });
      return false;
    }

    // Validation simple de Luhn pour le numéro de carte
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    if (sum % 10 !== 0) {
      toast.error('Numéro de carte invalide', {
        description: 'Veuillez vérifier le numéro de votre carte.'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateCard()) return;

    setIsProcessing(true);
    
    try {
      // Simulation de l'ajout de carte
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newCard: SavedCard = {
        id: `card_${Date.now()}`,
        lastFour: cardNumber.replace(/\s/g, '').slice(-4),
        brand: getCardBrand(cardNumber),
        expiryMonth,
        expiryYear,
        holderName,
        isDefault: false
      };
      
      onCardAdded(newCard);
      
      toast.success('Carte ajoutée avec succès !', {
        description: `${newCard.brand} se terminant par ${newCard.lastFour}`
      });
      
      handleClose();
    } catch (error) {
      toast.error('Erreur', {
        description: 'Impossible d\'ajouter la carte. Veuillez réessayer.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: String(i + 1).padStart(2, '0')
  }));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            Ajouter une carte bancaire
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Ajoutez une carte pour vos paiements et recharges futures
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Aperçu de la carte */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 text-white relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Badge className="bg-white/20 text-white border-0">
                {getCardBrand(cardNumber)}
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-6 w-6" />
                <span className="text-sm">Carte bancaire</span>
              </div>
              <div className="space-y-2">
                <div className="font-mono text-lg tracking-wider">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div className="flex justify-between text-sm">
                  <span>{holderName || 'NOM DU TITULAIRE'}</span>
                  <span>
                    {expiryMonth && expiryYear ? `${expiryMonth}/${expiryYear.slice(-2)}` : 'MM/AA'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Numéro de carte
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8A47] focus:border-transparent font-mono"
                maxLength={23}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Nom du titulaire
              </label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                placeholder="JEAN DUPONT"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8A47] focus:border-transparent uppercase"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Mois
                </label>
                <select
                  value={expiryMonth}
                  onChange={(e) => setExpiryMonth(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8A47] focus:border-transparent"
                >
                  <option value="">MM</option>
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Année
                </label>
                <select
                  value={expiryYear}
                  onChange={(e) => setExpiryYear(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8A47] focus:border-transparent"
                >
                  <option value="">AAAA</option>
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8A47] focus:border-transparent font-mono text-center"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="saveCard"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="rounded border-gray-300 text-[#2D8A47] focus:ring-[#2D8A47]"
              />
              <label htmlFor="saveCard" className="text-sm text-gray-600">
                Enregistrer cette carte pour les paiements futurs
              </label>
            </div>
          </div>

          {/* Informations de sécurité */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-start space-x-2">
              <Lock className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-700">
                <p className="font-medium mb-1">🔒 Paiement sécurisé</p>
                <p>Vos informations sont chiffrées et protégées par SSL. Nous ne stockons jamais votre CVV.</p>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !cardNumber || !holderName || !expiryMonth || !expiryYear || !cvv}
              className="flex-1 bg-[#2D8A47] hover:bg-[#245A35] text-white"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Ajout...</span>
                </div>
              ) : (
                'Ajouter la carte'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};