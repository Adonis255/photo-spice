import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook received!')
  
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!

    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is missing!')
      return NextResponse.json({ error: 'Stripe key missing' }, { status: 500 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET is missing!')
      return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
      console.log('✅ Webhook signature verified. Event type:', event.type)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { listing_id, tier, visitor_id } = session.metadata || {}

      console.log('📦 Session metadata:', { listing_id, tier, visitor_id })

      if (!listing_id || !tier || !visitor_id) {
        console.error('❌ Missing metadata in webhook!')
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      // 🔥 CREATE SUPABASE CLIENT WITH SERVICE ROLE KEY (BYPASSES RLS)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Supabase credentials missing!')
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      console.log('✅ Supabase admin client created')

      // Insert the purchase
      const { data, error } = await supabaseAdmin
        .from('purchases')
        .insert({
          listing_id,
          visitor_id,
          tier,
          stripe_session_id: session.id,
        })
        .select()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('✅ Purchase saved successfully!', data)
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('❌ Unhandled webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}