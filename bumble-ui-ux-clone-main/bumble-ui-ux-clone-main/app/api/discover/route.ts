import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'userId is required' 
      }, { status: 400 });
    }

    // Get current user's profile to determine preferences
    const currentUser = await dbUtils.getUserById(parseInt(userId));
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    // Get current user's profile to access looking_for preference
    const currentUserProfile = await dbUtils.getProfileByUserId(parseInt(userId));
    const lookingFor = currentUserProfile?.looking_for || 'female'; // default to 'female' if not set

    // Get profiles based on user's preferences (looking_for)
    const profiles = await dbUtils.getDiscoverProfiles(parseInt(userId), lookingFor);
    
    return NextResponse.json({ 
      success: true, 
      profiles 
    });
  } catch (error) {
    console.error('Discover profiles error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching profiles' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, targetUserId, actionType } = body;

    if (action === 'swipe') {
      if (!userId || !targetUserId || !actionType) {
        return NextResponse.json({ 
          success: false, 
          message: 'userId, targetUserId, and actionType are required' 
        }, { status: 400 });
      }

      // Record the swipe action
      const result = await dbUtils.recordSwipeAction(userId, targetUserId, actionType);
      
      // Check if it's a match (both users liked each other)
      let isMatch = false;
      if (actionType === 'like' || actionType === 'super_like') {
        isMatch = await dbUtils.checkForMatch(userId, targetUserId);
        if (isMatch) {
          // Create match record
          await dbUtils.createMatch(userId, targetUserId);
        }
      }

      return NextResponse.json({ 
        success: true, 
        isMatch,
        message: isMatch ? 'It\'s a match!' : 'Swipe recorded' 
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Invalid action' 
    }, { status: 400 });
  } catch (error) {
    console.error('Swipe action error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error processing swipe action' 
    }, { status: 500 });
  }
}
