'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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

type Listing = {
  id: string
  name: string
  description: string
  category: string
  photo_price_kes: number
  number_price_kes: number
  phone_number: string
  image_url: string
  hasPhoto: boolean
  hasNumber: boolean
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [filter, setFilter] = useState('all')
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [modalListing, setModalListing] = useState<Listing | null>(null)
  const [modalTier, setModalTier] = useState<'photo' | 'number'>('photo')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async (vId: string, showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      let query = supabase.from('listings').select('*')
      if (filter !== 'all') query = query.eq('category', filter)
      const { data: listingsData, error: listErr } = await query
      if (listErr) throw new Error(listErr.message)

      const { data: purchasesData, error: purchErr } = await supabase
        .from('purchases')
        .select('listing_id, tier')
        .eq('visitor_id', vId)
      if (purchErr) throw new Error(purchErr.message)

      const photoPurchased = new Set()
      const numberPurchased = new Set()
      purchasesData?.forEach((p: any) => {
        if (p.tier === 'photo') photoPurchased.add(p.listing_id)
        if (p.tier === 'number') numberPurchased.add(p.listing_id)
      })

      const merged = listingsData?.map((item: any) => ({
        ...item,
        hasPhoto: photoPurchased.has(item.id),
        hasNumber: numberPurchased.has(item.id),
      })) || []

      console.log('📸 Fetched listings with status:', merged.map(m => ({ name: m.name, hasPhoto: m.hasPhoto, hasNumber: m.hasNumber })))
      setListings(merged)
    } catch (err) {
      toast.error('Failed to load data: ' + (err as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load and filter changes
  useEffect(() => {
    const id = getVisitorId()
    setVisitorId(id)
    fetchData(id)
  }, [filter])

  // Auto-refresh when returning from Stripe (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === 'true') {
        toast.success('Payment successful! Refreshing...')
        const id = getVisitorId()
        fetchData(id, true)
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

  const handleRefresh = () => {
    if (!visitorId) return
    setRefreshing(true)
    fetchData(visitorId, true)
    toast.success('Refreshed!')
  }

  const openModal = (listing: Listing, tier: 'photo' | 'number') => {
    setModalListing(listing)
    setModalTier(tier)
    setIsModalOpen(true)
  }

  const handleCheckout = async () => {
    if (!modalListing || !visitorId) return
    const price = modalTier === 'photo' ? modalListing.photo_price_kes : modalListing.number_price_kes
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: modalListing.id,
          tier: modalTier,
          price,
          visitorId,
        }),
      })
      const data = await res.json()
      if (!data.url) throw new Error('No checkout URL')
      window.location.href = data.url
    } catch (err) {
      toast.error('Payment initiation failed')
    }
  }

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `${name}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4 pb-20">
      <Toaster position="top-center" />
      <div className="text-center py-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          ✨ Spicy Connections ✨
        </h1>
        <p className="text-gray-400 text-sm">Tap to unlock beauty</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-2 px-4 py-1 bg-pink-100 text-pink-600 rounded-full text-xs hover:bg-pink-200 transition-all disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-2 my-4">
        {['all', 'male', 'female', 'international', 'local'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-5 py-1.5 rounded-full capitalize border text-sm transition-all ${
              filter === cat
                ? 'border-pink-500 bg-pink-500 text-white shadow-lg'
                : 'border-gray-200 bg-white/80 text-gray-600 hover:border-pink-300'
            }`}
          >
            {cat === 'all' ? '🔥 All' : cat}
          </button>
        ))}
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading spicy content...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {listings.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-md hover:shadow-xl transition-all border border-pink-100"
            >
              <div className="relative w-full aspect-square rounded-full overflow-hidden shadow-md ring-2 ring-pink-200 floating">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover transition-all duration-700"
                  style={{ filter: item.hasPhoto ? 'none' : 'blur(16px)' }}
                />
                {!item.hasPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-full">🔒</span>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-sm mt-3 text-gray-800 truncate w-full text-center">{item.name}</h3>
              <div className="w-full bg-gray-100 rounded-lg p-1.5 my-2 text-center font-mono text-xs flex items-center justify-center gap-1">
                <span>📞</span>
                {item.hasNumber ? (
                  <span className="text-green-700 font-bold tracking-wide">{item.phone_number}</span>
                ) : (
                  <span className="text-gray-400 tracking-widest">•••• ••••</span>
                )}
                {!item.hasNumber && <span className="text-[10px] bg-gray-200 px-1 rounded">Locked</span>}
              </div>
              <div className="w-full space-y-1.5 mt-1">
                {!item.hasPhoto ? (
                  <button
                    onClick={() => openModal(item, 'photo')}
                    className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-white py-1.5 rounded-full text-xs font-bold shadow hover:shadow-pink-200 transition-all active:scale-95"
                  >
                    👀 Photo - KSh {item.photo_price_kes}
                  </button>
                ) : !item.hasNumber ? (
                  <button
                    onClick={() => openModal(item, 'number')}
                    className="w-full bg-gradient-to-r from-purple-400 to-purple-600 text-white py-1.5 rounded-full text-xs font-bold shadow hover:shadow-purple-200 transition-all active:scale-95"
                  >
                    📞 Number - KSh {item.number_price_kes}
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => downloadImage(item.image_url, item.name)}
                      className="flex-1 bg-green-500 text-white py-1.5 rounded-full text-xs font-bold hover:bg-green-600 transition-all"
                    >
                      📥 Download
                    </button>
                    <a
                      href={`https://wa.me/${item.phone_number.replace(/\s/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-500 text-white py-1.5 rounded-full text-xs font-bold hover:bg-blue-600 transition-all text-center"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && modalListing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-pink-300 shadow-lg mb-4">
                <img
                  src={modalListing.image_url}
                  alt={modalListing.name}
                  className="w-full h-full object-cover"
                  style={{ filter: modalListing.hasPhoto ? 'none' : 'blur(15px)' }}
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{modalListing.name}</h3>
              <p className="text-gray-500 text-sm mt-1">{modalListing.description}</p>
              <div className="my-4 py-3 px-6 bg-pink-50 rounded-2xl w-full">
                <span className="text-sm text-pink-600 font-semibold">
                  {modalTier === 'photo' ? '👀 Unlock Photo' : '📞 Reveal Number'}
                </span>
                <p className="text-3xl font-extrabold text-pink-600">
                  KSh {modalTier === 'photo' ? modalListing.photo_price_kes : modalListing.number_price_kes}
                </p>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-4 rounded-full text-lg font-bold shadow-lg shadow-pink-200 hover:scale-[1.02] transition-all active:scale-95"
              >
                💳 Pay with M-Pesa / Card
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="mt-4 text-gray-400 text-sm underline-offset-2 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        .floating { animation: float 4s ease-in-out infinite; }
      `}</style>
    </main>
  )
}