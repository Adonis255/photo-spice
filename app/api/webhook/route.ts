import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { listing_id, tier, visitor_id } = session.metadata!

    console.log('🔄 Webhook received. Metadata:', { listing_id, tier, visitor_id })

    if (!listing_id || !tier || !visitor_id) {
      console.error('❌ Missing metadata in webhook!')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('purchases')
      .insert({
        listing_id: listing_id,
        visitor_id: visitor_id,
        tier: tier,
        stripe_session_id: session.id,
      })
      .select()

    if (error) {
      console.error('❌ Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Purchase saved!', data)
  }

  return NextResponse.json({ received: true })
}