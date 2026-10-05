import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET /api/notifications - Fetch user notifications
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/notifications/mark-read - Mark notifications as read
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationIds } = await req.json();

    if (notificationIds && Array.isArray(notificationIds)) {
      const { error } = await supabase
        .from('notifications')
        .update({ isRead: true })
        .in('id', notificationIds)
        .eq('userId', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('notifications')
        .update({ isRead: true })
        .eq('userId', user.id)
        .eq('isRead', false);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
