import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  console.log('🔔 Paystack webhook received')
  
  try {
    // Paystack sends JSON, not raw text
    const body = await req.json()
    const signature = req.headers.get('x-paystack-signature')

    // Verify signature (optional but recommended for production)
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      console.error('❌ PAYSTACK_SECRET_KEY is missing!')
      return NextResponse.json({ error: 'Paystack secret missing' }, { status: 500 })
    }

    // Compute expected signature using SHA512
    const expectedSignature = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(body))
      .digest('hex')

    // For security, reject if signatures don't match
    if (signature && expectedSignature !== signature) {
      console.error('❌ Webhook signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { event, data } = body
    console.log('📦 Event type:', event)

    // Handle charge.success event (successful payment)
    if (event === 'charge.success') {
      const { metadata } = data
      const { listing_id, tier, visitor_id } = metadata || {}

      console.log('📦 Metadata:', { listing_id, tier, visitor_id })

      if (!listing_id || !tier || !visitor_id) {
        console.error('❌ Missing metadata in webhook!')
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      // Use Supabase service role key to bypass RLS
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Supabase credentials missing!')
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Save purchase to Supabase
      const { data: inserted, error } = await supabaseAdmin
        .from('purchases')
        .insert({
          listing_id,
          visitor_id,
          tier,
          stripe_session_id: data.reference, // Paystack transaction reference
        })
        .select()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('✅ Purchase saved successfully!', inserted)
      return NextResponse.json({ success: true })
    }

    // Acknowledge receipt for other events
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('❌ Unhandled webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}