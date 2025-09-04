import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const result = await dbUtils.createUser(data);
        return NextResponse.json({ 
          success: true, 
          userId: result.lastInsertRowid,
          message: 'User created successfully' 
        });

      case 'getByWallet':
        const userByWallet = await dbUtils.getUserByWallet(data.walletAddress);
        return NextResponse.json({ 
          success: true, 
          user: userByWallet 
        });

      case 'getByEmail':
        const userByEmail = await dbUtils.getUserByEmail(data.email);
        return NextResponse.json({ 
          success: true, 
          user: userByEmail 
        });

      case 'getById':
        const userById = dbUtils.getUserById(data.id);
        return NextResponse.json({ 
          success: true, 
          user: userById 
        });

      case 'updateVerificationStatus':
        await dbUtils.updateUserVerificationStatus(data.id, data.status);
        return NextResponse.json({ 
          success: true, 
          message: 'Verification status updated' 
        });

      case 'updateWalletInfo':
        await dbUtils.updateUserWalletInfo(data.id, data.wallet_address, data.verification_status);
        return NextResponse.json({ 
          success: true, 
          message: 'Wallet information updated' 
        });

      case 'updateProfileCompleted':
        await dbUtils.updateUserProfileCompleted(data.id, data.completed);
        return NextResponse.json({ 
          success: true, 
          message: 'Profile completion status updated' 
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
    const id = searchParams.get('id');
    const walletAddress = searchParams.get('walletAddress');
    const email = searchParams.get('email');

    if (id) {
      const userId = parseInt(id);
      const user = await dbUtils.getUserById(userId);
      const profile = await dbUtils.getProfileByUserId(userId);
      return NextResponse.json({ success: true, user, profile });
    }

    if (walletAddress) {
      const user = await dbUtils.getUserByWallet(walletAddress);
      return NextResponse.json({ success: true, user });
    }

    if (email) {
      const user = await dbUtils.getUserByEmail(email);
      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'No search parameter provided' 
    }, { status: 400 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Database error occurred' 
    }, { status: 500 });
  }
}
