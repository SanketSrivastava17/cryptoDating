import { NextRequest, NextResponse } from 'next/server';
import { dbUtils } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'signup':
        try {
          const { email, password, first_name, gender } = data;
          
          if (!email || !password || !first_name || !gender) {
            return NextResponse.json({ 
              success: false, 
              message: 'Missing required fields' 
            }, { status: 400 });
          }

          const result = await dbUtils.createUserWithEmailPassword({
            email,
            password,
            first_name,
            gender
          });
          
          return NextResponse.json({ 
            success: true, 
            userId: result.userId,
            user: {
              id: result.user.id,
              email: result.user.email,
              first_name: result.user.first_name,
              gender: result.user.gender,
              verification_type: result.user.verification_type,
              verification_status: result.user.verification_status
            },
            message: 'User created successfully' 
          });
        } catch (error: any) {
          return NextResponse.json({ 
            success: false, 
            message: error.message 
          }, { status: 400 });
        }

      case 'login':
        const { email, password } = data;
        
        if (!email || !password) {
          return NextResponse.json({ 
            success: false, 
            message: 'Email and password are required' 
          }, { status: 400 });
        }

        const user = await dbUtils.authenticateUser(email, password);
        
        if (!user) {
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid email or password' 
          }, { status: 401 });
        }

        return NextResponse.json({ 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            gender: user.gender,
            verification_type: user.verification_type,
            verification_status: user.verification_status,
            profile_completed: user.profile_completed
          },
          message: 'Login successful' 
        });

      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Authentication error occurred' 
    }, { status: 500 });
  }
}
