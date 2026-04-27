import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { CreditCard, Smartphone, Send, Check, AlertCircle, User } from 'lucide-react';

interface TransferFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess: (amount: number, method: string, recipient: string) => void;
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
    id: 'wallet',
    name: 'Solde Wallet',
    icon: '💰',
    color: 'text-green-600',
    bgColor: 'bg-green-600',
    connected: true,
    fees: 0
  }
];

type Step = 'recipient' | 'amount' | 'method' | 'confirmation';

export const TransferFundsModal: React.FC<TransferFundsModalProps> = ({
  isOpen,
  onClose,
  onTransferSuccess,
  currentBalance
}) => {
  const [step, setStep] = useState<Step>('recipient');
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPaymentMethod = paymentMethods.find(m => m.id === selectedMethod);
  const finalAmount = customAmount ? parseInt(customAmount) || 0 : amount;
  const totalWithFees = finalAmount + (selectedPaymentMethod?.fees || 0);

  const handleClose = () => {
    if (!isProcessing) {
      setStep('recipient');
      setRecipient('');
      setRecipientName('');
      setAmount(0);
      setCustomAmount('');
      setSelectedMethod(null);
      onClose();
    }
  };

  const validateRecipient = (input: string) => {
    // Validation pour numéro de téléphone ou email
    const phoneRegex = /^\+?261[0-9]{9}$|^0[0-9]{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return phoneRegex.test(input) || emailRegex.test(input);
  };

  const handleRecipientContinue = () => {
    if (!recipient.trim()) {
      toast.error('Destinataire requis', {
        description: 'Veuillez entrer un numéro de téléphone ou email.'
      });
      return;
    }

    if (!validateRecipient(recipient)) {
      toast.error('Format invalide', {
        description: 'Entrez un numéro valide (+261xxxxxxxxx) ou un email.'
      });
      return;
    }

    // Simulation de recherche du destinataire
    const mockNames = ['Rabe Andriana', 'Hery Rakoto', 'Nana Rasoanirina', 'Fidy Randria'];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
    setRecipientName(randomName);
    setStep('amount');
  };

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount(0);
  };

  const handleProceedToMethod = () => {
    if (finalAmount < 1000) {
      toast.error('Montant insuffisant', {
        description: 'Le montant minimum pour un transfert est de 1,000 Ar.'
      });
      return;
    }

    if (finalAmount > currentBalance && selectedMethod !== 'wallet') {
      toast.warning('Solde insuffisant', {
        description: 'Vous pouvez utiliser d\'autres méthodes de paiement.'
      });
    }

    setStep('method');
  };

  const handleMethodSelect = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    
    // Vérification pour les méthodes mobiles locales
    if (['mvola', 'orange', 'airtel'].includes(methodId) && !method?.connected) {
      toast.warning('Service non connecté', {
        description: 'Ce service de paiement n\'est pas encore connecté à votre compte.'
      });
      return;
    }

    // Vérification pour le wallet
    if (methodId === 'wallet' && finalAmount > currentBalance) {
      toast.error('Solde insuffisant', {
        description: `Votre solde actuel est de ${currentBalance.toLocaleString()} Ar.`
      });
      return;
    }
    
    setSelectedMethod(methodId);
  };

  const handleProceedToConfirmation = () => {
    if (!selectedMethod) {
      toast.error('Méthode requise', {
        description: 'Veuillez sélectionner une méthode de paiement.'
      });
      return;
    }
    setStep('confirmation');
  };

  const handleConfirmTransfer = async () => {
    setIsProcessing(true);
    
    try {
      // Simulation du transfert
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onTransferSuccess(finalAmount, selectedMethod!, recipient);
      
      toast.success('Transfert réussi !', {
        description: `${finalAmount.toLocaleString()} Ar envoyés à ${recipientName}`
      });
      
      handleClose();
    } catch (error) {
      toast.error('Erreur de transfert', {
        description: 'Une erreur est survenue. Veuillez réessayer.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderRecipientStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">👤</div>
        <h3 className="font-bold text-lg mb-2">Destinataire</h3>
        <p className="text-gray-600 text-sm">Entrez le numéro ou email du destinataire</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-2">
            Numéro de téléphone ou email
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="+261xxxxxxxxx ou email@exemple.com"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8A47] focus:border-transparent"
          />
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Formats acceptés:</p>
              <p>• +261xxxxxxxxx (numéro malgache)</p>
              <p>• 0xxxxxxxxx (format local)</p>
              <p>• email@domaine.com</p>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleRecipientContinue}
        disabled={!recipient.trim()}
        className="w-full bg-[#2D8A47] hover:bg-[#245A35] text-white h-12"
      >
        Continuer
      </Button>
    </div>
  );

  const renderAmountStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">💸</div>
        <h3 className="font-bold text-lg mb-2">Montant à transférer</h3>
        <p className="text-gray-600 text-sm">
          Destinataire: <span className="font-medium">{recipientName}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">{recipient}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[5000, 10000, 25000, 50000, 100000, 200000].map((presetAmount) => (
          <Button
            key={presetAmount}
            variant={amount === presetAmount ? "default" : "outline"}
            onClick={() => handleAmountSelect(presetAmount)}
            className={`h-12 ${
              amount === presetAmount 
                ? 'bg-[#2D8A47] hover:bg-[#245A35] text-white' 
                : 'border-gray-300 hover:border-[#2D8A47]'
            }`}
          >
            {presetAmount.toLocaleString()} Ar
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

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => setStep('recipient')}
          className="flex-1"
        >
          Retour
        </Button>
        <Button
          onClick={handleProceedToMethod}
          disabled={!finalAmount || finalAmount < 1000}
          className="flex-1 bg-[#2D8A47] hover:bg-[#245A35] text-white"
        >
          Continuer ({finalAmount ? finalAmount.toLocaleString() : 0} Ar)
        </Button>
      </div>
    </div>
  );

  const renderMethodStep = () => {
    const localMethods = paymentMethods.filter(m => ['mvola', 'orange', 'airtel'].includes(m.id));
    const walletMethod = paymentMethods.filter(m => m.id === 'wallet');
    const internationalMethods = paymentMethods.filter(m => m.id === 'card');

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="font-bold text-lg mb-2">Source de financement</h3>
          <p className="text-gray-600 text-sm">Montant: {finalAmount.toLocaleString()} Ar</p>
        </div>

        {/* Solde Wallet */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-sm text-gray-500 px-3">Votre wallet</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          
          {walletMethod.map((method) => (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedMethod === method.id ? 'ring-2 ring-[#2D8A47] border-[#2D8A47]' : 'border-gray-200'
              } ${finalAmount > currentBalance ? 'opacity-60' : ''}`}
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
                        Solde: {currentBalance.toLocaleString()} Ar
                        {method.fees === 0 && (
                          <span className="ml-2 text-green-600">• Sans frais</span>
                        )}
                        {finalAmount > currentBalance && (
                          <span className="ml-2 text-red-600">• Solde insuffisant</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {finalAmount <= currentBalance ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Disponible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-500 border-red-200">
                        Insuffisant
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

        {/* Paiements internationaux */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-sm text-gray-500 px-3">Carte bancaire</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          
          {internationalMethods.map((method) => (
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
                    <div className={`w-10 h-10 ${method.bgColor} rounded-lg flex items-center justify-center text-white text-lg`}>
                      {method.icon}
                    </div>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-gray-600">
                        Disponible
                        {method.fees > 0 && (
                          <span className="ml-2 text-orange-600">• Frais: {method.fees} Ar</span>
                        )}
                        <span className="ml-2 text-blue-600">• Visa, MasterCard</span>
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
        <h3 className="font-bold text-lg mb-2">Confirmer le transfert</h3>
        <p className="text-gray-600 text-sm">Vérifiez les détails avant de confirmer</p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Destinataire:</span>
            <div className="text-right">
              <div className="font-medium">{recipientName}</div>
              <div className="text-xs text-gray-500">{recipient}</div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Montant:</span>
            <span className="font-medium">{finalAmount.toLocaleString()} Ar</span>
          </div>
          {selectedPaymentMethod?.fees! > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Frais:</span>
              <span className="text-orange-600">{selectedPaymentMethod?.fees} Ar</span>
            </div>
          )}
          <div className="border-t pt-2">
            <div className="flex justify-between items-center font-medium">
              <span>Total à débiter:</span>
              <span className="text-lg">{totalWithFees.toLocaleString()} Ar</span>
            </div>
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
              {selectedPaymentMethod?.id === 'wallet' && (
                <div className="text-xs text-gray-500 mt-1">
                  Débit immédiat du solde wallet
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
              <p className="font-medium mb-1">ℹ️ Information:</p>
              <p>Le destinataire recevra le montant dans les 2-5 minutes selon la méthode choisie.</p>
            </div>
          </div>
        </div>
      </div>

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
          onClick={handleConfirmTransfer}
          disabled={isProcessing}
          className="flex-1 bg-[#2D8A47] hover:bg-[#245A35] text-white"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Envoi...</span>
            </div>
          ) : (
            `Confirmer le transfert`
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            Transférer des fonds
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Envoyez de l'argent rapidement et en toute sécurité à vos proches
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {step === 'recipient' && renderRecipientStep()}
          {step === 'amount' && renderAmountStep()}
          {step === 'method' && renderMethodStep()}
          {step === 'confirmation' && renderConfirmationStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};