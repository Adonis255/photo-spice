'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

const getVisitorId = () => {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    localStorage.setItem('visitor_id', id)
  }
  return id
}

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [processingNumber, setProcessingNumber] = useState(false)

  useEffect(() => {
    const id = getVisitorId()
    setVisitorId(id)
    
    // Get data from URL params
    const listingId = searchParams.get('id')
    const name = searchParams.get('name')
    const description = searchParams.get('description')
    const imageUrl = searchParams.get('image_url')
    const numberPrice = searchParams.get('number_price')
    const phoneNumber = searchParams.get('phone_number')

    if (listingId && name && imageUrl) {
      setListing({
        id: listingId,
        name,
        description: description || '',
        image_url: imageUrl,
        number_price_kes: parseInt(numberPrice || '0'),
        phone_number: phoneNumber || '',
      })
      setLoading(false)
    } else {
      toast.error('No listing data found. Redirecting...')
      setTimeout(() => router.push('/'), 3000)
    }
  }, [searchParams, router])

  const handleBuyNumber = () => {
    if (!listing || !visitorId) return
    setProcessingNumber(true)

    const price = listing.number_price_kes

    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: 'customer@example.com',
        amount: price * 100,
        ref: new Date().getTime().toString(),
        metadata: {
          listing_id: listing.id,
          tier: 'number',
          visitor_id: visitorId,
        },
        callback: (response: any) => {
          toast.success('🎉 Number unlocked!')
          setProcessingNumber(false)
          // Refresh to show unlocked number
          window.location.reload()
        },
        onClose: () => {
          toast.error('Payment cancelled')
          setProcessingNumber(false)
        }
      })
      handler.openIframe()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading your purchase...</p>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <p className="text-gray-500">No data found. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <Toaster position="top-center" />

      <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-sm opacity-30"
          style={{ backgroundImage: `url(${listing.image_url})` }}
        />
        
        <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center">
          <div className="mb-4">
            <span className="inline-block px-4 py-2 bg-green-100 text-green-600 rounded-full text-sm font-bold">
              ✅ Purchase Successful!
            </span>
          </div>

          <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-xl ring-4 ring-pink-200 mb-4">
            <img
              src={listing.image_url}
              alt={listing.name}
              className="w-full h-full object-cover"
            />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {listing.name}
          </h2>

          <p className="text-gray-500 text-sm mb-4">
            {listing.description || 'No description available'}
          </p>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent mb-4" />

          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">📞 Phone Number</p>
            
            {listing.phone_number ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-green-600">
                  {listing.phone_number}
                </span>
                <a
                  href={`https://wa.me/${listing.phone_number.replace(/\s/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-600 transition-all"
                >
                  💬 WhatsApp
                </a>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm mb-3">
                  🔒 Number locked. Unlock to connect!
                </p>
                
                <button
                  onClick={handleBuyNumber}
                  disabled={processingNumber}
                  className="relative w-full py-4 px-6 rounded-full text-lg font-bold text-white transition-all duration-300 glowing-button"
                >
                  {processingNumber ? 'Processing...' : `📞 Buy Number - KSh ${listing.number_price_kes}`}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold hover:bg-gray-200 transition-all"
          >
            🏠 Back to Gallery
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 5px #ec4899, 0 0 10px #ec4899, 0 0 20px #a855f7;
          }
          50% {
            box-shadow: 0 0 10px #ec4899, 0 0 20px #a855f7, 0 0 40px #a855f7, 0 0 80px #ec4899;
          }
          100% {
            box-shadow: 0 0 5px #ec4899, 0 0 10px #ec4899, 0 0 20px #a855f7;
          }
        }

        .glowing-button {
          background: linear-gradient(135deg, #ec4899, #a855f7);
          animation: pulse-glow 1.5s ease-in-out infinite;
          transition: all 0.3s ease;
          transform: scale(1);
        }

        .glowing-button:hover {
          transform: scale(1.05);
          animation-duration: 0.8s;
        }

        .glowing-button:disabled {
          opacity: 0.6;
          animation: none;
          transform: scale(1);
        }
      `}</style>
    </main>
  )
}