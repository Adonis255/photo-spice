import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {getSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  // Lazy init Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature failed.', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { listing_id, tier, visitor_id } = session.metadata!

    const supabaseAdmin = getSupabaseClient()

    const { error } = await supabaseAdmin
      .from('purchases')
      .insert({
        listing_id,
        visitor_id,
        tier,
        stripe_session_id: session.id,
      })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}