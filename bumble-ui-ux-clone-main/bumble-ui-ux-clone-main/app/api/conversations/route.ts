import { NextRequest, NextResponse } from 'next/server';
import { 
  getConversationsByUserId, 
  getMessagesByConversationId, 
  sendMessage, 
  createConversation,
  getConversationByMatchId 
} from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // If conversationId is provided, get messages for that conversation
    if (conversationId) {
      const messages = await getMessagesByConversationId(parseInt(conversationId));
      return NextResponse.json({ messages });
    }

    // Otherwise, get all conversations for the user
    const conversations = await getConversationsByUserId(parseInt(userId));
    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Conversations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, conversationId, matchId, content } = body;

    if (!userId || !content) {
      return NextResponse.json({ error: 'User ID and content are required' }, { status: 400 });
    }

    let conversation;

    // If we have a conversationId, use it
    if (conversationId) {
      conversation = { id: conversationId };
    } 
    // If we have a matchId, find or create conversation for that match
    else if (matchId) {
      conversation = await getConversationByMatchId(parseInt(matchId));
      if (!conversation) {
        conversation = await createConversation(parseInt(matchId));
      }
    } else {
      return NextResponse.json({ error: 'Conversation ID or Match ID is required' }, { status: 400 });
    }

    // Send the message
    const message = await sendMessage({
      conversationId: conversation.id,
      senderId: parseInt(userId),
      content,
      messageType: 'text'
    });

    return NextResponse.json({ message, conversationId: conversation.id });

  } catch (error) {
    console.error('Conversations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
