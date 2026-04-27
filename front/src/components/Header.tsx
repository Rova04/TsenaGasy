import React, { useState } from 'react';
import { Search, ShoppingCart, User, Menu, MapPin, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Avatar, AvatarFallback } from './ui/avatar';
import { UserData } from '../config/authStorage';

interface HeaderProps {
  cartItemCount?: number;
  onLoginClick: () => void;
  onCartClick?: () => void;
  onProfileClick?: () => void;
  onSearchClick?: (query: string) => void;
  onNavigationClick?: (section: string) => void;
  currentUser?: UserData | null;
  onLogoutClick?: () => void;
}

export function Header({ cartItemCount = 0, onLoginClick, onCartClick, onProfileClick, onSearchClick, onNavigationClick, currentUser, onLogoutClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim() === '') {
      onSearchClick?.('');  // ça va remettre tous les produits
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSearchClick) return;

    onSearchClick(searchQuery.trim());
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#2D8A47] to-[#4CAF50] text-white text-center py-2 px-4">
        <p className="text-sm">
          <MapPin className="inline h-4 w-4 mr-1" />
          Livraison gratuite à Antananarivo pour les commandes de plus de 100 000 Ar
        </p>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <nav className="flex flex-col space-y-4 mt-6">
                  <button 
                    onClick={() => onNavigationClick?.('categories')}
                    className="text-lg hover:text-[#2D8A47] transition-colors text-left"
                  >
                    Catégories
                  </button>
                  <button 
                    onClick={() => onNavigationClick?.('offers')}
                    className="text-lg hover:text-[#2D8A47] transition-colors text-left"
                  >
                    Offres
                  </button>
                  <button 
                    onClick={() => onNavigationClick?.('services')}
                    className="text-lg hover:text-[#2D8A47] transition-colors text-left"
                  >
                    Services
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            <div>
              <div className="text-2xl font-bold text-[#2D8A47]">TsenaGasy</div>
              {/* <div className="text-xs text-orange-600 font-medium hidden md:block">MODE DÉMO</div> */}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Rechercher des produits, marques, vendeurs..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-4 pr-12 py-3 rounded-full border-2 border-gray-200 focus:border-[#2D8A47] focus:ring-0"
                />
                <Button 
                  type="submit"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#2D8A47] hover:bg-[#245A35]"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Button variant="ghost" size="sm" className="relative border border-gray-300 rounded-md" onClick={onCartClick}>
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#FFA726] text-black text-xs flex items-center justify-center">
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {/* User Account */}
            {currentUser ? (
              <div className="flex items-center space-x-2 cursor-pointer" onClick={onProfileClick}>
                <Avatar>
                  <AvatarFallback className="bg-[#2D8A47] text-white">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
                </div>

                {/* Séparateur vertical */}
                <div className="h-6 w-px bg-gray-300" />

                {/* Bouton Déconnexion visible */}
                {onLogoutClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // évite d’ouvrir le dashboard
                      onLogoutClick();
                    }}
                    className="
                      flex items-center gap-1 
                      px-3 py-1.5 
                      text-gray-600 
                      border border-gray-300 
                      rounded-md 
                      hover:text-red-600 
                      hover:border-red-400 
                      transition
                    "
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <Button 
                onClick={onLoginClick}
                variant="outline"
                className="border-[#2D8A47] text-[#2D8A47] hover:bg-[#2D8A47] hover:text-white"
              >
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Se connecter</span>
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Menu - Desktop */}
        <nav className="hidden md:flex space-x-8 pb-4 border-b border-gray-100">
          <button 
            onClick={() => onNavigationClick?.('categories')}
            className="text-gray-700 hover:text-[#2D8A47] transition-colors"
          >
            Catégories
          </button>
          <button 
            onClick={() => onNavigationClick?.('offers')}
            className="text-gray-700 hover:text-[#2D8A47] transition-colors"
          >
            Offres
          </button>
          <button 
            onClick={() => onNavigationClick?.('services')}
            className="text-gray-700 hover:text-[#2D8A47] transition-colors"
          >
            Services
          </button>
        </nav>
      </div>
    </header>
  );
}