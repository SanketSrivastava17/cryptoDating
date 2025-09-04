// Simple file-based database for development
// This provides persistence across server restarts

import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

// Check if we're in a production environment that doesn't support file writes
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

const DB_FILE = path.join(process.cwd(), 'data.json')

// Password hashing utilities
const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

export interface User {
  id: number;
  wallet_address?: string;
  email?: string;
  password_hash?: string;
  first_name?: string;
  gender?: 'male' | 'female';
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

// In-memory storage
let users: User[] = [];
let profiles: Profile[] = [];
let faceVerifications: any[] = [];
let walletVerifications: any[] = [];
let swipeActions: any[] = [];
let matches: any[] = [];
let idCounter = 1;
let isLoaded = false;

async function loadDatabase() {
  if (isLoaded) return;

  // In production environments that don't support file writes, use empty data
  if (isProduction) {
    console.log('Production environment detected, using empty database');
    users = [];
    profiles = [];
    faceVerifications = [];
    walletVerifications = [];
    swipeActions = [];
    matches = [];
    idCounter = 1;
    isLoaded = true;
    return;
  }

  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    users = parsed.users || [];
    profiles = parsed.profiles || [];
    faceVerifications = parsed.faceVerifications || [];
    walletVerifications = parsed.walletVerifications || [];
    swipeActions = parsed.swipeActions || [];
    matches = parsed.matches || [];
    idCounter = parsed.idCounter || 1;
    console.log('Database loaded from file:', { users: users.length, profiles: profiles.length });
  } catch (error) {
    console.log('No existing database file, starting fresh');
    // File doesn't exist, use empty arrays
    users = [];
    profiles = [];
    faceVerifications = [];
    walletVerifications = [];
    swipeActions = [];
    matches = [];
    idCounter = 1;
  }
  isLoaded = true;
}

async function saveDatabase() {
  // Skip saving in production environments that don't support file writes
  if (isProduction) {
    console.log('Production environment detected, skipping file save');
    return;
  }

  try {
    // Read current conversations and messages from file to preserve them
    let existingConversations = [];
    let existingMessages = [];

    try {
      const existingData = await fs.readFile(DB_FILE, 'utf-8');
      const parsed = JSON.parse(existingData);
      existingConversations = parsed.conversations || [];
      existingMessages = parsed.messages || [];
    } catch (readError) {
      // File doesn't exist or is invalid, use empty arrays
      console.log('No existing conversations/messages found, starting fresh');
    }

    const data = {
      users,
      profiles,
      faceVerifications,
      walletVerifications,
      swipeActions,
      matches,
      conversations: existingConversations,
      messages: existingMessages,
      idCounter
    };
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    console.log('Database saved to file with conversations and messages');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

function generateId(): number {
  return idCounter++;
}

export async function getDatabase() {
  await loadDatabase();
  return {
    users,
    profiles,
    faceVerifications,
    walletVerifications,
    swipeActions,
    matches
  };
}

// Helper functions for database operations
export const dbUtils = {
  // User operations
  createUser: async (data: {
    wallet_address?: string;
    email?: string;
    password?: string;
    first_name?: string;
    gender?: 'male' | 'female';
    verification_type: 'wallet' | 'face';
    verification_status?: 'pending' | 'verified' | 'failed';
  }) => {
    await loadDatabase();
    const newUser: User = {
      id: generateId(),
      wallet_address: data.wallet_address,
      email: data.email,
      password_hash: data.password ? hashPassword(data.password) : undefined,
      first_name: data.first_name,
      gender: data.gender,
      verification_type: data.verification_type,
      verification_status: data.verification_status || 'pending',
      profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    users.push(newUser);
    await saveDatabase();
    return { lastInsertRowid: newUser.id };
  },

  // Authentication functions
  authenticateUser: async (email: string, password: string) => {
    await loadDatabase();
    const user = users.find(user => user.email === email);
    if (!user || !user.password_hash) {
      return null;
    }

    const isValidPassword = verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return null;
    }

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  createUserWithEmailPassword: async (data: {
    email: string;
    password: string;
    first_name: string;
    gender: 'male' | 'female';
  }) => {
    await loadDatabase();

    // Check if user already exists
    const existingUser = users.find(user => user.email === data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const newUser: User = {
      id: generateId(),
      email: data.email,
      password_hash: hashPassword(data.password),
      first_name: data.first_name,
      gender: data.gender,
      verification_type: data.gender === 'male' ? 'wallet' : 'face',
      verification_status: 'pending',
      profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.push(newUser);
    await saveDatabase();
    return { userId: newUser.id, user: newUser };
  },

  getUserByWallet: async (walletAddress: string) => {
    await loadDatabase();
    return users.find(user => user.wallet_address === walletAddress);
  },

  getUserByEmail: async (email: string) => {
    await loadDatabase();
    return users.find(user => user.email === email);
  },

  getUserById: async (id: number) => {
    await loadDatabase();
    return users.find(user => user.id === id);
  },

  updateUserVerificationStatus: async (id: number, status: 'pending' | 'verified' | 'failed') => {
    await loadDatabase();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex].verification_status = status;
      users[userIndex].updated_at = new Date().toISOString();
      await saveDatabase();
      return { changes: 1 };
    }
    return { changes: 0 };
  },

  updateUserWalletInfo: async (id: number, walletAddress: string, verificationStatus?: string) => {
    await loadDatabase();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex].wallet_address = walletAddress;
      if (verificationStatus) {
        users[userIndex].verification_status = verificationStatus as 'pending' | 'verified' | 'failed';
      }
      users[userIndex].updated_at = new Date().toISOString();
      await saveDatabase();
      return { changes: 1 };
    }
    return { changes: 0 };
  },

  updateUserProfileCompleted: async (id: number, completed: boolean) => {
    await loadDatabase();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex].profile_completed = completed;
      users[userIndex].updated_at = new Date().toISOString();
      await saveDatabase();
      return { changes: 1 };
    }
    return { changes: 0 };
  },

  // Profile operations
  createProfile: async (data: {
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
    await loadDatabase();
    console.log('Creating profile with data:', data);

    // Optional: Remove any existing profiles for this user to avoid duplicates
    // Comment this out if you want to keep multiple profiles per user
    const existingProfileIndex = profiles.findIndex(p => p.user_id === data.user_id);
    if (existingProfileIndex !== -1) {
      console.log(`Removing existing profile for user ${data.user_id} to replace with new one`);
      profiles.splice(existingProfileIndex, 1);
    }

    const newProfile: Profile = {
      id: generateId(),
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
    await saveDatabase();
    console.log('Profile created and saved:', newProfile);
    console.log('Total profiles now:', profiles.length);
    return { lastInsertRowid: newProfile.id };
  },

  getProfileByUserId: async (userId: number) => {
    await loadDatabase();
    console.log(`Looking for profile with userId: ${userId} (type: ${typeof userId})`);
    console.log(`Available profiles:`, profiles.map(p => ({ id: p.id, user_id: p.user_id, name: p.name, created_at: p.created_at })));

    // Find ALL profiles for this user and return the most recent one
    const userProfiles = profiles.filter(profile =>
      profile.user_id === userId || profile.user_id === parseInt(userId.toString())
    );

    if (userProfiles.length === 0) {
      console.log(`No profiles found for userId: ${userId}`);
      return null;
    }

    // Sort by creation date (most recent first) and return the latest profile
    const mostRecentProfile = userProfiles.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    console.log(`Found ${userProfiles.length} profiles for user ${userId}, returning most recent:`, mostRecentProfile);
    return mostRecentProfile;
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
    const profileIndex = profiles.findIndex(profile => profile.user_id === userId);
    if (profileIndex !== -1) {
      Object.assign(profiles[profileIndex], data);
      profiles[profileIndex].updated_at = new Date().toISOString();
      return { changes: 1 };
    }
    return { changes: 0 };
  },

  // Face verification operations
  createFaceVerification: (data: {
    user_id: number;
    face_token?: string;
    confidence_score?: number;
    verification_data?: any;
  }) => {
    const newVerification = {
      id: generateId(),
      user_id: data.user_id,
      face_token: data.face_token,
      confidence_score: data.confidence_score,
      verification_data: data.verification_data,
      created_at: new Date().toISOString()
    };
    faceVerifications.push(newVerification);
    return { lastInsertRowid: newVerification.id };
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
    const newVerification = {
      id: generateId(),
      user_id: data.user_id,
      wallet_address: data.wallet_address,
      signature: data.signature,
      nonce: data.nonce,
      eth_balance: data.eth_balance,
      verification_data: data.verification_data,
      created_at: new Date().toISOString()
    };
    walletVerifications.push(newVerification);
    return { lastInsertRowid: newVerification.id };
  },

  // Get all users with profiles for matching
  getAllUsersWithProfiles: () => {
    return users
      .filter(user => user.verification_status === 'verified' && user.profile_completed)
      .map(user => {
        const profile = profiles.find(p => p.user_id === user.id);
        return { ...user, ...profile };
      })
      .filter(userProfile => userProfile.name); // Only return users with complete profiles
  },

  // Discover profiles for swiping
  getDiscoverProfiles: async (userId: number, lookingFor: string) => {
    await loadDatabase();

    // Get profiles that match the user's preferences
    const eligibleProfiles = profiles.filter(profile => {
      // Don't show user's own profile
      if (profile.user_id === userId) return false;

      // Filter by gender preference
      if (lookingFor !== 'both' && profile.gender !== lookingFor) return false;

      // Check if user hasn't already swiped on this profile
      const hasSwipedAlready = swipeActions.some(swipe =>
        swipe.user_id === userId && swipe.target_user_id === profile.user_id
      );
      if (hasSwipedAlready) return false;

      // Only show verified users with completed profiles
      const user = users.find(u => u.id === profile.user_id);
      if (!user || user.verification_status !== 'verified' || !user.profile_completed) return false;

      return true;
    });

    // Shuffle and return up to 10 profiles
    const shuffled = eligibleProfiles.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  },

  // Record swipe action
  recordSwipeAction: async (userId: number, targetUserId: number, actionType: string) => {
    await loadDatabase();
    const newSwipeAction = {
      id: generateId(),
      user_id: userId,
      target_user_id: targetUserId,
      action_type: actionType, // 'like', 'pass', 'super_like'
      created_at: new Date().toISOString()
    };
    swipeActions.push(newSwipeAction);
    await saveDatabase();
    return { lastInsertRowid: newSwipeAction.id };
  },

  // Check if two users liked each other (match)
  checkForMatch: async (userId: number, targetUserId: number) => {
    await loadDatabase();

    // Check if the target user has already liked this user
    const targetUserLiked = swipeActions.some(swipe =>
      swipe.user_id === targetUserId &&
      swipe.target_user_id === userId &&
      (swipe.action_type === 'like' || swipe.action_type === 'super_like')
    );

    return targetUserLiked;
  },

  // Create match record
  createMatch: async (userId1: number, userId2: number) => {
    await loadDatabase();

    // Check if match already exists
    const existingMatch = matches.some(match =>
      (match.user1_id === userId1 && match.user2_id === userId2) ||
      (match.user1_id === userId2 && match.user2_id === userId1)
    );

    if (!existingMatch) {
      const newMatch = {
        id: generateId(),
        user1_id: userId1,
        user2_id: userId2,
        created_at: new Date().toISOString(),
        is_active: true
      };
      matches.push(newMatch);
      await saveDatabase();
      return { lastInsertRowid: newMatch.id };
    }

    return null;
  },

  // Get user's matches
  getUserMatches: async (userId: number) => {
    await loadDatabase();

    const userMatches = matches.filter(match =>
      (match.user1_id === userId || match.user2_id === userId) && match.is_active
    );

    // Get profiles for matched users
    const matchedProfiles = userMatches.map(match => {
      const matchedUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const profile = profiles.find(p => p.user_id === matchedUserId);
      return { ...match, profile };
    }).filter(match => match.profile);

    return matchedProfiles;
  }
};

// Get matches for a user where no messages have been exchanged yet
export async function getMatchQueueForUser(userId: number) {
  await loadDatabase();
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  // Get all matches for this user from the current data
  const userMatches = (data.matches || []).filter((match: any) =>
    (match.user1_id === userId || match.user2_id === userId) && match.is_active
  );

  // For each match, get the conversation
  const queue = [];
  for (const match of userMatches) {
    const conversation = (data.conversations || []).find((conv: any) => conv.match_id === match.id);

    // If no conversation, add to queue
    if (!conversation) {
      const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const profile = (data.profiles || []).find((p: any) => p.user_id === otherUserId);
      if (profile) queue.push({ match, profile, reason: 'no_conversation' });
      continue;
    }

    // If conversation exists but no messages
    const messages = (data.messages || []).filter((msg: any) => msg.conversation_id === conversation.id);
    if (messages.length === 0) {
      const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const profile = (data.profiles || []).find((p: any) => p.user_id === otherUserId);
      if (profile) queue.push({ match, profile, reason: 'no_messages' });
    }
  }

  return queue;
}

// Messaging interfaces
export interface Conversation {
  id: number;
  match_id: number;
  participants: number[];
  last_message_id: number | null;
  last_message_at: string | null;
  created_at: string;
  is_active: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'sticker';
  created_at: string;
  is_read: boolean;
}

// Messaging functions
export const getConversationsByUserId = async (userId: number) => {
  await loadDatabase();

  // Read current data to get conversations
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  // Get conversations where user is a participant
  const userConversations = (data.conversations || []).filter((conv: Conversation) =>
    conv.participants.includes(userId) && conv.is_active
  );

  // Enrich with participant profiles and last message info
  const enrichedConversations = await Promise.all(
    userConversations.map(async (conv: Conversation) => {
      // Get other participant (not the current user)
      const otherUserId = conv.participants.find(id => id !== userId);
      const otherUserProfile = profiles.find(p => p.user_id === otherUserId);

      // Get last message if exists
      let lastMessage = null;
      if (conv.last_message_id) {
        lastMessage = (data.messages || []).find((msg: Message) => msg.id === conv.last_message_id);
      }

      return {
        ...conv,
        otherUser: otherUserProfile,
        lastMessage
      };
    })
  );

  // Sort by last message time (most recent first)
  return enrichedConversations.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
};

export const getMessagesByConversationId = async (conversationId: number) => {
  await loadDatabase();

  // Read current data to get messages
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  const conversationMessages = (data.messages || []).filter((msg: Message) =>
    msg.conversation_id === conversationId
  );

  // Sort by creation time (oldest first for chat display)
  return conversationMessages.sort((a: Message, b: Message) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

export const sendMessage = async (messageData: {
  conversationId: number;
  senderId: number;
  content: string;
  messageType: 'text' | 'image' | 'sticker';
}) => {
  await loadDatabase();

  // Read current data
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  if (!data.messages) data.messages = [];
  if (!data.conversations) data.conversations = [];

  // Generate new ID and increment counter
  const newMessageId = data.idCounter || idCounter;
  data.idCounter = newMessageId + 1;
  idCounter = data.idCounter; // Keep local counter in sync

  // Create new message
  const newMessage: Message = {
    id: newMessageId,
    conversation_id: messageData.conversationId,
    sender_id: messageData.senderId,
    content: messageData.content,
    message_type: messageData.messageType,
    created_at: new Date().toISOString(),
    is_read: false
  };

  data.messages.push(newMessage);

  // Update conversation's last message info
  const conversationIndex = data.conversations.findIndex((conv: Conversation) =>
    conv.id === messageData.conversationId
  );

  if (conversationIndex !== -1) {
    data.conversations[conversationIndex].last_message_id = newMessage.id;
    data.conversations[conversationIndex].last_message_at = newMessage.created_at;
  }

  // Update the database file
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));

  return newMessage;
};

export const createConversation = async (matchId: number) => {
  await loadDatabase();

  // Read current data
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  if (!data.conversations) data.conversations = [];

  // Find the match to get participants
  const match = matches.find(m => m.id === matchId);
  if (!match) {
    throw new Error('Match not found');
  }

  // Check if conversation already exists for this match
  const existingConversation = data.conversations.find((conv: Conversation) =>
    conv.match_id === matchId
  );

  if (existingConversation) {
    return existingConversation;
  }

  // Generate new ID and increment counter
  const newConversationId = data.idCounter || idCounter;
  data.idCounter = newConversationId + 1;
  idCounter = data.idCounter; // Keep local counter in sync

  // Create new conversation
  const newConversation: Conversation = {
    id: newConversationId,
    match_id: matchId,
    participants: [match.user1_id, match.user2_id],
    last_message_id: null,
    last_message_at: null,
    created_at: new Date().toISOString(),
    is_active: true
  };

  data.conversations.push(newConversation);

  // Update the database file
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));

  return newConversation;
};

export const getConversationByMatchId = async (matchId: number) => {
  await loadDatabase();

  // Read current data
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  return (data.conversations || []).find((conv: Conversation) =>
    conv.match_id === matchId
  );
};

// Swipe actions functions
export const performSwipeAction = async (userId: number, targetUserId: number, action: 'like' | 'pass') => {
  await loadDatabase();

  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  if (!data.swipeActions) data.swipeActions = [];
  if (!data.matches) data.matches = [];

  // Generate new ID and increment counter
  const newSwipeId = data.idCounter || idCounter;
  data.idCounter = newSwipeId + 1;
  idCounter = data.idCounter;

  // Create swipe action
  const swipeAction = {
    id: newSwipeId,
    user_id: userId,
    target_user_id: targetUserId,
    action,
    created_at: new Date().toISOString()
  };

  data.swipeActions.push(swipeAction);

  // Check for mutual like to create match
  let isMatch = false;
  if (action === 'like') {
    const targetUserSwipe = data.swipeActions.find((swipe: any) =>
      swipe.user_id === targetUserId &&
      swipe.target_user_id === userId &&
      swipe.action === 'like'
    );

    if (targetUserSwipe) {
      // Create a match
      const newMatchId = data.idCounter || idCounter;
      data.idCounter = newMatchId + 1;
      idCounter = data.idCounter;

      const match = {
        id: newMatchId,
        user1_id: Math.min(userId, targetUserId),
        user2_id: Math.max(userId, targetUserId),
        created_at: new Date().toISOString(),
        is_active: true
      };

      data.matches.push(match);
      isMatch = true;
    }
  }

  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));

  return { swipeAction, isMatch };
};

export const getSwipeActionsByUserId = async (userId: number) => {
  await loadDatabase();

  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  return (data.swipeActions || []).filter((swipe: any) => swipe.user_id === userId);
};

// Matches functions
export const getMatchesByUserId = async (userId: number) => {
  await loadDatabase();

  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));

  const userMatches = (data.matches || []).filter((match: any) =>
    (match.user1_id === userId || match.user2_id === userId) && match.is_active
  );

  // Enrich with other user's profile
  const enrichedMatches = userMatches.map((match: any) => {
    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const otherUserProfile = profiles.find(p => p.user_id === otherUserId);

    return {
      ...match,
      otherUser: otherUserProfile
    };
  });

  return enrichedMatches.sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};
