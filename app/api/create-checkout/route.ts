import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    // 🔥 Initialize Stripe INSIDE the handler, using the env var
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // No hardcoded version – let it use your account default
    })

    const { listingId, tier, price, visitorId } = await req.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'kes',
            product_data: {
              name: `${tier === 'photo' ? '📸 Unlock Photo' : '📞 Reveal Number'}`,
              description: `Listing ID: ${listingId}`,
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/?success=true`,
      cancel_url: `${req.nextUrl.origin}/?canceled=true`,
      metadata: {
        listing_id: listingId,
        tier: tier,
        visitor_id: visitorId,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}