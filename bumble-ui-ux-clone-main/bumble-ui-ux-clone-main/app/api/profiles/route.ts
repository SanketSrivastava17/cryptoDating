import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const result = await dbUtils.createProfile(data);
        // Update user profile completion status
        await dbUtils.updateUserProfileCompleted(data.user_id, true);
        return NextResponse.json({ 
          success: true, 
          profileId: result.lastInsertRowid,
          message: 'Profile created successfully' 
        });

      case 'update':
        const { userId, ...updateData } = data;
        await dbUtils.updateProfile(userId, updateData);
        return NextResponse.json({ 
          success: true, 
          message: 'Profile updated successfully' 
        });

      case 'getByUserId':
        const profile = await dbUtils.getProfileByUserId(data.userId);
        return NextResponse.json({ 
          success: true, 
          profile 
        });

      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Database error occurred' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('Profiles GET request - userId:', userId);

    if (userId) {
      const profile = await dbUtils.getProfileByUserId(parseInt(userId));
      console.log('Found profile:', profile);
      
      if (profile) {
        return NextResponse.json({ success: true, profile });
      } else {
        return NextResponse.json({ 
          success: false, 
          profile: null,
          message: 'No profile found for this user' 
        });
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'No userId parameter provided' 
    }, { status: 400 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Database error occurred' 
    }, { status: 500 });
  }
}
