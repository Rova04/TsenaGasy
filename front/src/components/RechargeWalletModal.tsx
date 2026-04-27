import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { CreditCard, Smartphone, DivideCircle, Check, AlertCircle, Plus } from 'lucide-react';
import { AddCardModal, SavedCard } from './AddCardModal';

interface RechargeWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRechargeSuccess: (amount: number, method: string) => void;
  currentBalance: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  connected: boolean;
  fees: number;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'mvola',
    name: 'MVola',
    icon: 'M',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    connected: true,
    fees: 0
  },
  {
    id: 'orange',
    name: 'Orange Money',
    icon: 'O',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    connected: false,
    fees: 100
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    icon: 'A',
    color: 'text-red-700',
    bgColor: 'bg-red-600',
    connected: false,
    fees: 150
  },
  {
    id: 'card',
    name: 'Carte Bancaire',
    icon: '💳',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
    connected: true,
    fees: 200
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: 'P',
    color: 'text-blue-700',
    bgColor: 'bg-blue-700',
    connected: true,
    fees: 300
  }
];

const predefinedAmounts = [5000, 10000, 25000, 50000, 100000, 200000];

export function RechargeWalletModal({ isOpen, onClose, onRechargeSuccess, currentBalance }: RechargeWalletModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([
    {
      id: 'card_1',
      lastFour: '4242',
      brand: 'Visa',
      expiryMonth: '12',
      expiryYear: '2027',
      holderName: 'JEAN RAKOTO',
      isDefault: true
    }
  ]);
  const [step, setStep] = useState<'amount' | 'method' | 'confirmation'>('amount');

  const finalAmount = selectedAmount || (customAmount ? parseInt(customAmount) : 0);
  const selectedPaymentMethod = paymentMethods.find(m => m.id === selectedMethod);
  const fees = selectedPaymentMethod?.fees || 0;
  const totalAmount = finalAmount + fees;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleMethodSelect = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    
    // Pour les méthodes mobiles locales, vérifier la connexion
    if (['mvola', 'orange', 'airtel'].includes(methodId) && !method?.connected) {
      toast.warning('Service non connecté', {
        description: 'Ce service de paiement n\'est pas encore connecté à votre compte.'
      });
      return;
    }
    
    // Pour les méthodes internationales, toujours disponibles
    if (['card', 'paypal'].includes(methodId)) {
      setSelectedMethod(methodId);
      return;
    }
    
    setSelectedMethod(methodId);
  };

  const handleProceedToMethod = () => {
    if (!finalAmount || finalAmount < 1000) {
      toast.error('Montant invalide', {
        description: 'Le montant minimum de recharge est de 1,000 Ar'
      });
      return;
    }
    if (finalAmount > 500000) {
      toast.error('Montant trop élevé', {
        description: 'Le montant maximum de recharge est de 500,000 Ar'
      });
      return;
    }
    setStep('method');
  };

  const handleProceedToConfirmation = () => {
    if (!selectedMethod) {
      toast.error('Aucune méthode sélectionnée', {
        description: 'Veuillez choisir une méthode de paiement'
      });
      return;
    }
    setStep('confirmation');
  };

  const handleConfirmRecharge = async () => {
    if (!selectedMethod || !finalAmount) return;

    setIsProcessing(true);

    try {
      // Simuler le traitement de paiement
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simuler une réussite à 95%
      const success = Math.random() > 0.05;

      if (success) {
        onRechargeSuccess(finalAmount, selectedPaymentMethod?.name || '');
        toast.success('Recharge réussie !', {
          description: `Votre wallet a été rechargé de ${finalAmount.toLocaleString()} Ar via ${selectedPaymentMethod?.name}`
        });
        handleClose();
      } else {
        toast.error('Échec de la recharge', {
          description: 'Un problème est survenu. Veuillez réessayer.'
        });
      }
    } catch (error) {
      toast.error('Erreur de connexion', {
        description: 'Impossible de traiter la recharge. Vérifiez votre connexion.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setSelectedMethod(null);
    setStep('amount');
    setIsProcessing(false);
    setIsAddCardModalOpen(false);
    onClose();
  };

  const handleCardAdded = (newCard: SavedCard) => {
    setSavedCards(prev => [...prev, newCard]);
    setIsAddCardModalOpen(false);
    toast.success('Carte ajoutée', {
      description: 'Vous pouvez maintenant l\'utiliser pour vos recharges.'
    });
  };

  const renderAmountStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">💰</div>
        <h3 className="font-bold text-lg mb-2">Choisissez le montant</h3>
        <p className="text-gray-600 text-sm">Solde actuel: {currentBalance.toLocaleString()} Ar</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {predefinedAmounts.map((amount) => (
          <Button
            key={amount}
            variant={selectedAmount === amount ? "default" : "outline"}
            className={`h-12 ${selectedAmount === amount ? 'bg-[#2D8A47] hover:bg-[#245A35]' : 'border-gray-300 hover:border-[#2D8A47]'}`}
            onClick={() => handleAmountSelect(amount)}
          >
            {amount.toLocaleString()} Ar
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Montant personnalisé</label>
        <div className="relative">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            placeholder="Entrez un montant..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8A47] focus:border-transparent"
            min="1000"
            max="500000"
          />
          <span className="absolute right-3 top-3 text-gray-500 text-sm">Ar</span>
        </div>
        <p className="text-xs text-gray-500">Minimum: 1,000 Ar • Maximum: 500,000 Ar</p>
      </div>

      <Button
        onClick={handleProceedToMethod}
        disabled={!finalAmount || finalAmount < 1000}
        className="w-full bg-[#2D8A47] hover:bg-[#245A35] text-white h-12"
      >
        Continuer ({finalAmount ? finalAmount.toLocaleString() : 0} Ar)
      </Button>
    </div>
  );

  const renderMethodStep = () => {
    const localMethods = paymentMethods.filter(m => ['mvola', 'orange', 'airtel'].includes(m.id));
    const internationalMethods = paymentMethods.filter(m => ['card', 'paypal'].includes(m.id));

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="font-bold text-lg mb-2">Méthode de paiement</h3>
          <p className="text-gray-600 text-sm">Montant: {finalAmount.toLocaleString()} Ar</p>
        </div>

        {/* Paiements mobiles locaux */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-sm text-gray-500 px-3">Paiements mobiles malgaches</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          
          {localMethods.map((method) => (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedMethod === method.id ? 'ring-2 ring-[#2D8A47] border-[#2D8A47]' : 'border-gray-200'
              } ${!method.connected ? 'opacity-60' : ''}`}
              onClick={() => handleMethodSelect(method.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${method.bgColor} rounded-lg flex items-center justify-center text-white font-bold`}>
                      {method.icon}
                    </div>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-gray-600">
                        {method.connected ? 'Connecté' : 'Non connecté'}
                        {method.fees > 0 && method.connected && (
                          <span className="ml-2 text-orange-600">• Frais: {method.fees} Ar</span>
                        )}
                        {method.fees === 0 && method.connected && (
                          <span className="ml-2 text-green-600">• Sans frais</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {method.connected ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Non connecté
                      </Badge>
                    )}
                    {selectedMethod === method.id && (
                      <div className="w-5 h-5 bg-[#2D8A47] rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cartes bancaires sauvegardées */}
        {savedCards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-sm text-gray-500 px-3">Mes cartes</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>
            
            {savedCards.map((card) => (
              <Card
                key={card.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedMethod === card.id ? 'ring-2 ring-[#2D8A47] border-[#2D8A47]' : 'border-gray-200'
                }`}
                onClick={() => setSelectedMethod(card.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">
                        💳
                      </div>
                      <div>
                        <div className="font-medium">{card.brand} •••• {card.lastFour}</div>
                        <div className="text-sm text-gray-600">
                          {card.holderName} • {card.expiryMonth}/{card.expiryYear.slice(-2)}
                          {card.isDefault && (
                            <span className="ml-2 text-green-600">• Par défaut</span>
                          )}
                          <span className="ml-2 text-orange-600">• Frais: 200 Ar</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Disponible
                      </Badge>
                      {selectedMethod === card.id && (
                        <div className="w-5 h-5 bg-[#2D8A47] rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Paiements internationaux */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-sm text-gray-500 px-3">Paiements internationaux</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          
          {/* Ajouter une nouvelle carte */}
          <Card
            className="cursor-pointer transition-all hover:shadow-md border-dashed border-gray-300 hover:border-[#2D8A47]"
            onClick={() => setIsAddCardModalOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-medium text-gray-700">Ajouter une nouvelle carte</div>
                  <div className="text-sm text-gray-500">Visa, MasterCard, American Express</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {internationalMethods.filter(m => m.id === 'paypal').map((method) => (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedMethod === method.id ? 'ring-2 ring-[#2D8A47] border-[#2D8A47]' : 'border-gray-200'
              }`}
              onClick={() => handleMethodSelect(method.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${method.bgColor} rounded-lg flex items-center justify-center text-white font-bold`}>
                      {method.icon}
                    </div>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-gray-600">
                        Disponible
                        {method.fees > 0 && (
                          <span className="ml-2 text-orange-600">• Frais: {method.fees} Ar</span>
                        )}
                        <span className="ml-2 text-blue-600">• Compte PayPal requis</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      <Check className="h-3 w-3 mr-1" />
                      Disponible
                    </Badge>
                    {selectedMethod === method.id && (
                      <div className="w-5 h-5 bg-[#2D8A47] rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">💡 Astuce:</p>
              <p>Les paiements mobiles malgaches sont souvent plus rapides et peuvent avoir moins de frais.</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setStep('amount')}
            className="flex-1"
          >
            Retour
          </Button>
          <Button
            onClick={handleProceedToConfirmation}
            disabled={!selectedMethod}
            className="flex-1 bg-[#2D8A47] hover:bg-[#245A35] text-white"
          >
            Continuer
          </Button>
        </div>
      </div>
    );
  };

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="font-bold text-lg mb-2">Confirmer la recharge</h3>
        <p className="text-gray-600 text-sm">Vérifiez les détails avant de continuer</p>
      </div>

      <Card className="border-2 border-[#2D8A47] bg-green-50">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Montant de recharge:</span>
            <span className="font-bold text-lg">{finalAmount.toLocaleString()} Ar</span>
          </div>
          
          {fees > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Frais de transaction:</span>
              <span className="font-medium text-orange-600">{fees.toLocaleString()} Ar</span>
            </div>
          )}
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total à débiter:</span>
              <span className="font-bold text-xl text-[#2D8A47]">{totalAmount.toLocaleString()} Ar</span>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${selectedPaymentMethod?.bgColor} rounded-lg flex items-center justify-center text-white ${selectedPaymentMethod?.id === 'card' ? 'text-lg' : 'font-bold text-sm'}`}>
                {selectedPaymentMethod?.icon}
              </div>
              <div className="flex-1">
                <span className="font-medium">{selectedPaymentMethod?.name}</span>
                {selectedPaymentMethod?.id === 'card' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Paiement sécurisé par SSL • Visa, MasterCard acceptées
                  </div>
                )}
                {selectedPaymentMethod?.id === 'paypal' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Redirection vers PayPal • Protection acheteur incluse
                  </div>
                )}
                {['mvola', 'orange', 'airtel'].includes(selectedPaymentMethod?.id || '') && (
                  <div className="text-xs text-gray-500 mt-1">
                    Paiement mobile Madagascar • Instantané
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Nouveau solde après recharge:</p>
                <p className="font-bold">{(currentBalance + finalAmount).toLocaleString()} Ar</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => setStep('method')}
          disabled={isProcessing}
          className="flex-1"
        >
          Retour
        </Button>
        <Button
          onClick={handleConfirmRecharge}
          disabled={isProcessing}
          className="flex-1 bg-[#2D8A47] hover:bg-[#245A35] text-white"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Traitement...</span>
            </div>
          ) : (
            `Confirmer la recharge`
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              Recharger le Wallet
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Ajoutez des fonds à votre portefeuille électronique en utilisant différents moyens de paiement
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {step === 'amount' && renderAmountStep()}
            {step === 'method' && renderMethodStep()}
            {step === 'confirmation' && renderConfirmationStep()}
          </div>
        </DialogContent>
      </Dialog>
      
      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onCardAdded={handleCardAdded}
      />
    </>
  );
}