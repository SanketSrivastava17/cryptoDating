import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'createWalletVerification':
        const walletResult = dbUtils.createWalletVerification(data);
        return NextResponse.json({ 
          success: true, 
          verificationId: walletResult.lastInsertRowid,
          message: 'Wallet verification data saved' 
        });

      case 'createFaceVerification':
        const faceResult = dbUtils.createFaceVerification(data);
        return NextResponse.json({ 
          success: true, 
          verificationId: faceResult.lastInsertRowid,
          message: 'Face verification data saved' 
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
