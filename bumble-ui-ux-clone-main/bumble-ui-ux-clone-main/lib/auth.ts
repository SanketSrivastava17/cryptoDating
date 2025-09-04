// Authentication and session management utilities

export const authUtils = {
  // Get current session data
  getCurrentSession: () => {
    if (typeof window === 'undefined') return null;
    
    const userId = localStorage.getItem("userId");
    const userEmail = localStorage.getItem("userEmail");
    const userFirstName = localStorage.getItem("userFirstName");
    const userGender = localStorage.getItem("userGender");
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    
    // Check for valid session - must have both userId and isLoggedIn=true
    if (!userId || !isLoggedIn || isLoggedIn !== "true") {
      console.log("Invalid session - userId:", userId, "isLoggedIn:", isLoggedIn);
      return null;
    }
    
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      console.log("Invalid userId format:", userId);
      return null;
    }
    
    return {
      userId: userIdNum,
      userEmail,
      userFirstName,
      userGender,
      isLoggedIn: true
    };
  },

  // Set user session
  setUserSession: (userData: {
    userId: number;
    userEmail?: string;
    userFirstName?: string;
    userGender?: string;
    verificationType?: string;
  }) => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem("userId", userData.userId.toString());
    localStorage.setItem("isLoggedIn", "true");
    
    if (userData.userEmail) {
      localStorage.setItem("userEmail", userData.userEmail);
    }
    if (userData.userFirstName) {
      localStorage.setItem("userFirstName", userData.userFirstName);
    }
    if (userData.userGender) {
      localStorage.setItem("userGender", userData.userGender);
    }
    if (userData.verificationType) {
      localStorage.setItem("verificationType", userData.verificationType);
    }
  },

  // Clear user session
  clearUserSession: () => {
    if (typeof window === 'undefined') return;
    
    // Clear all auth-related localStorage items
    const authKeys = [
      "userId", "userEmail", "userFirstName", "userGender",
      "isLoggedIn", "profileCompleted", "faceVerified", 
      "maleVerified", "walletConnected", "verificationType"
    ];
    
    authKeys.forEach(key => localStorage.removeItem(key));
  },

  // Check if user is logged in
  isAuthenticated: () => {
    const session = authUtils.getCurrentSession();
    return session !== null;
  },

  // Validate session with database
  validateSession: async (userId: number) => {
    try {
      const response = await fetch(`/api/users?id=${userId}`);
      const data = await response.json();
      return data.success && data.user;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
};
