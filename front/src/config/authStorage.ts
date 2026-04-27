export type UserRole = 'client' | 'vendor' | 'admin' | 'customerSupport';

export interface UserData {
  name: string;
  role: UserRole;
  accessToken?: string;
  id?: string;
  email?: string;
  magasinId?: string;
}

const AUTH_STORAGE_KEY = 'user_auth_data';

export class AuthStorage {
  /**
   * Sauvegarder les données utilisateur
   */
  static saveUser(userData: UserData): void {
    try {
      const dataToStore = {
        ...userData,
        timestamp: Date.now() // Pour gérer l'expiration si besoin
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  }

  /**
   * Récupérer les données utilisateur
   */
  static getUser(): UserData | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      
      const userData = JSON.parse(stored);
      
      // Optionnel : vérifier l'expiration (ex: 7 jours)
      const EXPIRY_DAYS = 7;
      const now = Date.now();
      const expiry = userData.timestamp + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      if (now > expiry) {
        this.clearUser();
        return null;
      }
      
      return userData;
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return null;
    }
  }

  /**
   * Supprimer les données utilisateur
   */
  static clearUser(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  }

  /**
   * Vérifier si un utilisateur est connecté
   */
  static isLoggedIn(): boolean {
    const user = this.getUser();
    return user !== null && !!user.accessToken;
  }

  /**
   * Mettre à jour les données utilisateur
   */
  static updateUser(updates: Partial<UserData>): void {
    const currentUser = this.getUser();
    if (currentUser) {
      this.saveUser({ ...currentUser, ...updates });
    }
  }

  /**
   * Obtenir seulement le token
   */
  static getToken(): string | null {
    const user = this.getUser();
    return user?.accessToken || null;
  }
}