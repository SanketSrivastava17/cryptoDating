import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const database = await getDatabase();
    
    return NextResponse.json({
      success: true,
      data: {
        users: database.users,
        profiles: database.profiles,
        faceVerifications: database.faceVerifications,
        walletVerifications: database.walletVerifications
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching debug data' 
    }, { status: 500 });
  }
}
