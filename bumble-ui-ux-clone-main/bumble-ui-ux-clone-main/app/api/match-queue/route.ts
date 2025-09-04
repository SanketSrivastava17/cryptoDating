import { NextRequest, NextResponse } from 'next/server';
import { getMatchQueueForUser } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const queue = await getMatchQueueForUser(parseInt(userId));
    
    // Transform the queue to match frontend expectations
    const matchQueue = queue.map(item => ({
      id: item.match.id,
      user1_id: item.match.user1_id,
      user2_id: item.match.user2_id,
      created_at: item.match.created_at,
      is_active: item.match.is_active,
      otherUser: {
        id: item.profile.id,
        name: item.profile.name,
        photos: item.profile.photos
      },
      status: item.reason === 'no_conversation' ? 'no_conversation' : 'no_messages'
    }));
    
    return NextResponse.json({ 
      success: true,
      matchQueue 
    });
  } catch (error) {
    console.error('Match Queue GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
