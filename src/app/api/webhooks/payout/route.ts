import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-rb-signature') || '';
    const webhookSecret = process.env.PAYOUT_WEBHOOK_SECRET || '';

    if (process.env.NODE_ENV === 'production' && webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature.replace('sha256=', ''), 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        console.error('[WEBHOOK] Payout webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { eventId, eventType, data } = payload;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: 'Missing eventId or eventType' }, { status: 400 });
    }

    // Idempotency: check for duplicate events
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('eventId', eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[WEBHOOK] Duplicate payout event received: ${eventId}`);
      return NextResponse.json({ success: true, message: 'Duplicate event - already processed', duplicate: true });
    }

    // Persist the webhook event
    const { data: webhookRecord, error: webhookError } = await supabase
      .from('webhook_events')
      .insert({
        id: uuidv4(),
        provider: 'PAYOUT',
        eventId,
        eventType,
        payload: rawBody,
        signature,
        status: 'PENDING',
      })
      .select()
      .single();

    if (webhookError) throw webhookError;

    let processingError: string | null = null;

    if (eventType === 'payout.completed' || eventType === 'transfer.success') {
      const { payoutNumber, providerReference, utrNumber } = data || {};

      if (payoutNumber) {
        const { data: payout } = await supabase
          .from('payouts')
          .select('*, order:sell_orders(*, user:users(*))')
          .eq('payoutNumber', payoutNumber)
          .maybeSingle();

        if (payout) {
          await supabase
            .from('payouts')
            .update({
              status: 'COMPLETED',
              providerReference: providerReference || payout.providerReference,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .eq('id', payout.id);

          if (payout.order.state !== 'COMPLETED') {
            await supabase
              .from('sell_orders')
              .update({ state: 'COMPLETED', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
              .eq('id', payout.orderId);
          }

          await supabase.from('notifications').insert({
            id: uuidv4(),
            userId: payout.order.userId,
            title: 'INR Payout Confirmed',
            message: `Your INR payout of ₹${payout.amount} has been confirmed by our banking partner${utrNumber ? `. UTR: ${utrNumber}` : ''}.`,
            type: 'SUCCESS',
          });
        }
      }
    } else if (eventType === 'payout.failed' || eventType === 'transfer.failed') {
      const { payoutNumber, failureReason } = data || {};

      if (payoutNumber) {
        const { data: payout } = await supabase
          .from('payouts')
          .select('id, orderId')
          .eq('payoutNumber', payoutNumber)
          .maybeSingle();

        if (payout) {
          await supabase
            .from('payouts')
            .update({ status: 'FAILED', updatedAt: new Date().toISOString() })
            .eq('id', payout.id);

          await supabase
            .from('sell_orders')
            .update({ state: 'PAYOUT_FAILED', updatedAt: new Date().toISOString() })
            .eq('id', payout.orderId);

          await supabase.from('audit_logs').insert({
            id: uuidv4(),
            actorType: 'SYSTEM',
            actorId: 'PAYOUT_WEBHOOK',
            action: 'PAYOUT_FAILED_WEBHOOK',
            entityType: 'Payout',
            entityId: payout.id,
            details: JSON.stringify({ failureReason, eventId }),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      processingError = `Unknown payout event type: ${eventType}`;
      console.warn(`[WEBHOOK] Unknown payout event type received: ${eventType}`, { eventId });
    }

    await supabase
      .from('webhook_events')
      .update({
        status: processingError ? 'FAILED' : 'PROCESSED',
        processedAt: new Date().toISOString(),
      })
      .eq('id', webhookRecord.id);

    return NextResponse.json({ success: true, eventId, processed: !processingError });
  } catch (error: any) {
    console.error('[WEBHOOK] Payout webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
