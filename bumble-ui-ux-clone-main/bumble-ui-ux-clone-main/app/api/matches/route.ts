import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's matches
    const matchedProfiles = await dbUtils.getUserMatches(parseInt(userId));
    
    // Extract just the match objects (without profiles) for the matchId lookup
    const matches = matchedProfiles.map(mp => ({
      id: mp.id,
      user1_id: mp.user1_id,
      user2_id: mp.user2_id,
      created_at: mp.created_at,
      is_active: mp.is_active
    }));
    
    return NextResponse.json({ matches, matchedProfiles });

  } catch (error) {
    console.error('Matches GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
