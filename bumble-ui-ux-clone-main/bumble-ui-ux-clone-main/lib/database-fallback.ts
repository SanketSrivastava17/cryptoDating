// Simple fallback database using localStorage for development
// This is a temporary solution while we fix the SQLite issue

export interface User {
  id: number;
  wallet_address?: string;
  email?: string;
  verification_type: 'wallet' | 'face';
  verification_status: 'pending' | 'verified' | 'failed';
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  user_id: number;
  name: string;
  age?: number;
  bio?: string;
  interests?: string[];
  photos?: string[];
  location?: string;
  gender?: 'male' | 'female' | 'other';
  looking_for?: 'male' | 'female' | 'both';
  created_at: string;
  updated_at: string;
}

// Simple localStorage-based database for testing
class LocalStorageDB {
  private getFromStorage<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  }

  private generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  // User operations
  createUser(data: {
    wallet_address?: string;
    email?: string;
    verification_type: 'wallet' | 'face';
    verification_status?: 'pending' | 'verified' | 'failed';
  }) {
    const users = this.getFromStorage<User>('db_users');
    const newUser: User = {
      id: this.generateId(),
      wallet_address: data.wallet_address,
      email: data.email,
      verification_type: data.verification_type,
      verification_status: data.verification_status || 'pending',
      profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    users.push(newUser);
    this.saveToStorage('db_users', users);
    return { lastInsertRowid: newUser.id };
  }

  getUserByWallet(walletAddress: string) {
    const users = this.getFromStorage<User>('db_users');
    return users.find(user => user.wallet_address === walletAddress);
  }

  getUserByEmail(email: string) {
    const users = this.getFromStorage<User>('db_users');
    return users.find(user => user.email === email);
  }

  getUserById(id: number) {
    const users = this.getFromStorage<User>('db_users');
    return users.find(user => user.id === id);
  }

  updateUserVerificationStatus(id: number, status: 'pending' | 'verified' | 'failed') {
    const users = this.getFromStorage<User>('db_users');
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex].verification_status = status;
      users[userIndex].updated_at = new Date().toISOString();
      this.saveToStorage('db_users', users);
    }
    return { changes: userIndex !== -1 ? 1 : 0 };
  }

  updateUserProfileCompleted(id: number, completed: boolean) {
    const users = this.getFromStorage<User>('db_users');
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex].profile_completed = completed;
      users[userIndex].updated_at = new Date().toISOString();
      this.saveToStorage('db_users', users);
    }
    return { changes: userIndex !== -1 ? 1 : 0 };
  }

  // Profile operations
  createProfile(data: {
    user_id: number;
    name: string;
    age?: number;
    bio?: string;
    interests?: string[];
    photos?: string[];
    location?: string;
    gender?: 'male' | 'female' | 'other';
    looking_for?: 'male' | 'female' | 'both';
  }) {
    const profiles = this.getFromStorage<Profile>('db_profiles');
    const newProfile: Profile = {
      id: this.generateId(),
      user_id: data.user_id,
      name: data.name,
      age: data.age,
      bio: data.bio,
      interests: data.interests,
      photos: data.photos,
      location: data.location,
      gender: data.gender,
      looking_for: data.looking_for,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    profiles.push(newProfile);
    this.saveToStorage('db_profiles', profiles);
    return { lastInsertRowid: newProfile.id };
  }

  getProfileByUserId(userId: number) {
    const profiles = this.getFromStorage<Profile>('db_profiles');
    return profiles.find(profile => profile.user_id === userId);
  }

  // Verification operations
  createFaceVerification(data: any) {
    const verifications = this.getFromStorage<any>('db_face_verifications');
    const newVerification = {
      id: this.generateId(),
      ...data,
      created_at: new Date().toISOString()
    };
    verifications.push(newVerification);
    this.saveToStorage('db_face_verifications', verifications);
    return { lastInsertRowid: newVerification.id };
  }

  createWalletVerification(data: any) {
    const verifications = this.getFromStorage<any>('db_wallet_verifications');
    const newVerification = {
      id: this.generateId(),
      ...data,
      created_at: new Date().toISOString()
    };
    verifications.push(newVerification);
    this.saveToStorage('db_wallet_verifications', verifications);
    return { lastInsertRowid: newVerification.id };
  }
}

const localDB = new LocalStorageDB();

export function getDatabase() {
  return localDB;
}

// Helper functions for database operations
export const dbUtils = {
  // User operations
  createUser: (data: {
    wallet_address?: string;
    email?: string;
    verification_type: 'wallet' | 'face';
    verification_status?: 'pending' | 'verified' | 'failed';
  }) => {
    return localDB.createUser(data);
  },

  getUserByWallet: (walletAddress: string) => {
    return localDB.getUserByWallet(walletAddress);
  },

  getUserByEmail: (email: string) => {
    return localDB.getUserByEmail(email);
  },

  getUserById: (id: number) => {
    return localDB.getUserById(id);
  },

  updateUserVerificationStatus: (id: number, status: 'pending' | 'verified' | 'failed') => {
    return localDB.updateUserVerificationStatus(id, status);
  },

  updateUserProfileCompleted: (id: number, completed: boolean) => {
    return localDB.updateUserProfileCompleted(id, completed);
  },

  // Profile operations
  createProfile: (data: {
    user_id: number;
    name: string;
    age?: number;
    bio?: string;
    interests?: string[];
    photos?: string[];
    location?: string;
    gender?: 'male' | 'female' | 'other';
    looking_for?: 'male' | 'female' | 'both';
  }) => {
    return localDB.createProfile(data);
  },

  getProfileByUserId: (userId: number) => {
    return localDB.getProfileByUserId(userId);
  },

  updateProfile: (userId: number, data: Partial<{
    name: string;
    age: number;
    bio: string;
    interests: string[];
    photos: string[];
    location: string;
    gender: 'male' | 'female' | 'other';
    looking_for: 'male' | 'female' | 'both';
  }>) => {
    // For now, just return success - full implementation would update the profile
    return { changes: 1 };
  },

  // Face verification operations
  createFaceVerification: (data: {
    user_id: number;
    face_token?: string;
    confidence_score?: number;
    verification_data?: any;
  }) => {
    return localDB.createFaceVerification(data);
  },

  // Wallet verification operations
  createWalletVerification: (data: {
    user_id: number;
    wallet_address: string;
    signature?: string;
    nonce?: string;
    eth_balance?: string;
    verification_data?: any;
  }) => {
    return localDB.createWalletVerification(data);
  },

  // Get all users with profiles for matching
  getAllUsersWithProfiles: () => {
    // For now, return empty array - full implementation would join tables
    return [];
  }
};
