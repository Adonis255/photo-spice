'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

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
  is_free?: boolean
  is_blurred?: boolean
  is_number_locked?: boolean
}

export default function Home() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isShuffling, setIsShuffling] = useState(true)

  const [modalListing, setModalListing] = useState<Listing | null>(null)
  const [modalTier, setModalTier] = useState<'photo' | 'number'>('photo')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const shuffleInterval = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)

  const fetchData = useCallback(async (vId: string, showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      let query = supabase.from('listings').select('*')
      if (filter !== 'all' && filter !== 'free') {
        query = query.eq('category', filter)
      }
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
        is_free: false,
        is_blurred: item.is_blurred ?? false,
        is_number_locked: item.is_number_locked ?? true,
      })) || []

      if (filter === 'free' && merged.length > 0) {
        merged[0] = { ...merged[0], is_free: true, hasPhoto: true }
      }

      if (isMounted.current) {
        setListings(merged)
        setFilteredListings(merged)
      }
    } catch (err) {
      if (isMounted.current) {
        toast.error('Failed to load data: ' + (err as Error).message)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [filter])

  const applySearch = useCallback((search: string) => {
    if (!search.trim()) {
      setFilteredListings(listings)
      return
    }
    const term = search.toLowerCase()
    const filtered = listings.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    )
    setFilteredListings(filtered)
  }, [listings])

  const shuffleListings = useCallback(() => {
    if (!isShuffling || filteredListings.length <= 1) return
    const shuffled = [...filteredListings]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setFilteredListings(shuffled)
  }, [filteredListings, isShuffling])

  useEffect(() => {
    isMounted.current = true
    const id = getVisitorId()
    setVisitorId(id)
    fetchData(id)
    return () => { isMounted.current = false }
  }, [filter])

  useEffect(() => {
    applySearch(searchTerm)
  }, [applySearch, searchTerm])

  useEffect(() => {
    if (shuffleInterval.current) clearInterval(shuffleInterval.current)
    if (filteredListings.length > 1 && isShuffling) {
      shuffleInterval.current = setInterval(shuffleListings, 15000)
    }
    return () => {
      if (shuffleInterval.current) clearInterval(shuffleInterval.current)
    }
  }, [filteredListings.length, isShuffling, shuffleListings])

  useEffect(() => {
    const checkDark = () => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const handleThemeChange = () => checkDark()
    window.addEventListener('themeToggle' as any, handleThemeChange)
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      window.removeEventListener('themeToggle' as any, handleThemeChange)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === 'true') {
        toast.success('Payment successful! Redirecting...')
        const id = getVisitorId()
        fetchData(id, true)
        window.history.replaceState({}, '', '/success')
        router.push('/success')
      }
    }
  }, [fetchData, router])

  const handleRefresh = useCallback(() => {
    if (!visitorId) return
    setRefreshing(true)
    fetchData(visitorId, true)
    toast.success('Refreshed!')
  }, [visitorId, fetchData])

  const toggleDarkMode = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).toggleDarkMode) {
      (window as any).toggleDarkMode()
    } else {
      document.documentElement.classList.toggle('dark')
      const isDark = document.documentElement.classList.contains('dark')
      localStorage.setItem('darkMode', String(isDark))
      setDarkMode(isDark)
    }
  }, [])

  const openModal = useCallback((listing: Listing, tier: 'photo' | 'number') => {
    setModalListing(listing)
    setModalTier(tier)
    setIsModalOpen(true)
  }, [])

  const downloadImage = useCallback((url: string, name: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `${name}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const handlePaystackPayment = useCallback(() => {
    if (!modalListing || !visitorId) return

    const price = modalTier === 'photo' ? modalListing.photo_price_kes : modalListing.number_price_kes

    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: 'customer@example.com',
        amount: price * 100,
        currency: 'KES',
        ref: new Date().getTime().toString(),
        metadata: {
          listing_id: modalListing.id,
          tier: modalTier,
          visitor_id: visitorId,
        },
        callback: (response: any) => {
          toast.success('Payment successful! Redirecting...')
          setIsModalOpen(false)
          const url = `/success?id=${modalListing.id}&name=${encodeURIComponent(modalListing.name)}&description=${encodeURIComponent(modalListing.description)}&image_url=${encodeURIComponent(modalListing.image_url)}&number_price=${modalListing.number_price_kes}&phone_number=${encodeURIComponent(modalListing.phone_number)}`
          window.location.href = url
        },
        onClose: () => {
          toast.error('Payment cancelled')
          setIsModalOpen(false)
        }
      })
      handler.openIframe()
    }
  }, [modalListing, modalTier, visitorId])

  const displayListings = useMemo(() => filteredListings, [filteredListings])

  const toggleShuffle = useCallback(() => {
    setIsShuffling(prev => !prev)
    if (!isShuffling) {
      shuffleListings()
    }
  }, [isShuffling, shuffleListings])

  return (
    <main className={`min-h-screen p-4 pb-20 transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900' 
        : 'bg-gradient-to-br from-pink-50 via-white to-purple-50'
    }`}>
      <Toaster position="top-center" />

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="floating-emoji" style={{ left: '8%', animationDelay: '0s' }}>💋</div>
        <div className="floating-emoji" style={{ left: '20%', animationDelay: '1.2s' }}>😘</div>
        <div className="floating-emoji" style={{ left: '35%', animationDelay: '0.6s' }}>❤️</div>
        <div className="floating-emoji" style={{ left: '50%', animationDelay: '1.8s' }}>🔥</div>
        <div className="floating-emoji" style={{ left: '65%', animationDelay: '0.3s' }}>💕</div>
        <div className="floating-emoji" style={{ left: '80%', animationDelay: '1.5s' }}>✨</div>
        <div className="floating-emoji" style={{ left: '92%', animationDelay: '0.9s' }}>💋</div>
      </div>

      <div className="relative z-10">
        <div className="text-center py-4">
          <div className="flex justify-between items-center max-w-6xl mx-auto px-4">
            <div className="flex-1 text-center">
              <img
                src="/logo.jpg"
                alt="Spicy Connections"
                className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover mx-auto transition-all duration-300"
              />
              {/* 🔥 FIXED: No <hr> inside <p>, use <div> with <br /> */}
              <div className={`text-sm transition-colors duration-300 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                💕 Get connected with your soulmate today.
                <br />
                Check the profile, pay for the number of your desired soulmate, chat via WhatsApp or phone call 💕
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full text-sm transition-all ${
                  isShuffling
                    ? 'bg-pink-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                }`}
                title={isShuffling ? 'Shuffling ON' : 'Shuffling OFF'}
              >
                🔀
              </button>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-all ${
                  darkMode 
                    ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400' 
                    : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                }`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto mt-3 px-4">
            <input
              type="text"
              placeholder="🔍 Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-full border transition-all focus:outline-none focus:ring-2 ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-pink-500'
                  : 'bg-white border-pink-200 text-gray-800 placeholder-gray-400 focus:ring-pink-400'
              }`}
            />
          </div>

          <div className="flex items-center justify-center gap-3 mt-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-4 py-1 rounded-full text-xs transition-all disabled:opacity-50 ${
                darkMode
                  ? 'bg-purple-700 text-white hover:bg-purple-600'
                  : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
              }`}
            >
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 my-4">
          {['all', 'free', 'international', 'male', 'female'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-1.5 rounded-full capitalize border text-sm transition-all ${
                filter === cat
                  ? 'border-pink-500 bg-pink-500 text-white shadow-lg'
                  : darkMode
                    ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-pink-300'
                    : 'border-gray-200 bg-white/80 text-gray-600 hover:border-pink-300'
              }`}
            >
              {cat === 'all' ? '🔥 All' : cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Loading...</p>
          </div>
        ) : displayListings.length === 0 ? (
          <div className={`text-center py-20 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
            {searchTerm ? 'No results found' : 'No listings yet. Check back soon!'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {displayListings.map((item) => {
              const isPhotoUnlocked = item.hasPhoto || !item.is_blurred
              const isNumberVisible = item.hasNumber || !item.is_number_locked
              const isFree = item.is_free || false

              return (
                <div
                  key={item.id}
                  className={`flex flex-col items-center p-4 rounded-2xl shadow-md hover:shadow-xl transition-all border ${
                    darkMode
                      ? 'bg-gray-800/80 backdrop-blur-sm border-gray-700'
                      : 'bg-white/80 backdrop-blur-sm border-pink-100'
                  }`}
                >
                  <div className="relative w-full aspect-square rounded-full overflow-hidden shadow-md ring-2 ring-pink-200 floating">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-all duration-700"
                      style={{ filter: isPhotoUnlocked ? 'none' : 'blur(16px)' }}
                    />
                    {!isPhotoUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-full">🔒</span>
                      </div>
                    )}
                    {isFree && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        FREE
                      </div>
                    )}
                  </div>

                  <h3 className={`font-bold text-sm mt-3 truncate w-full text-center ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {item.name}
                  </h3>

                  <div className={`w-full rounded-lg p-1.5 my-2 text-center font-mono text-xs flex items-center justify-center gap-1 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <span>📞</span>
                    {isNumberVisible ? (
                      <span className="text-green-500 font-bold tracking-wide">{item.phone_number}</span>
                    ) : (
                      <span className="text-gray-400 tracking-widest">•••• ••••</span>
                    )}
                    {!isNumberVisible && <span className="text-[10px] bg-gray-200 px-1 rounded">Locked</span>}
                  </div>

                  <div className="w-full space-y-1.5 mt-1">
                    {!isPhotoUnlocked ? (
                      <button
                        onClick={() => openModal(item, 'photo')}
                        className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-white py-1.5 rounded-full text-xs font-bold shadow hover:shadow-pink-200 transition-all active:scale-95"
                      >
                        👀 Photo - KSh {item.photo_price_kes}
                      </button>
                    ) : !isNumberVisible ? (
                      <button
                        onClick={() => openModal(item, 'number')}
                        className={`w-full py-1.5 rounded-full text-xs font-bold shadow transition-all active:scale-95 ${
                          isFree
                            ? 'bg-gradient-to-r from-green-400 to-green-500 text-white hover:shadow-green-200'
                            : 'bg-gradient-to-r from-purple-400 to-purple-600 text-white hover:shadow-purple-200'
                        }`}
                      >
                        📞 {isFree ? 'Free Number' : `Number - KSh ${item.number_price_kes}`}
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

                  <p className={`text-xs text-center mt-2 line-clamp-2 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        )}

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
                  onClick={handlePaystackPayment}
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
      </div>

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes floatEmoji {
          0% { transform: translateY(0px) scale(1); opacity: 0.6; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.8; }
          100% { transform: translateY(0px) scale(1); opacity: 0.6; }
        }

        .floating {
          animation: float 4s ease-in-out infinite;
        }

        .floating-emoji {
          position: fixed;
          font-size: 1.8rem;
          animation: floatEmoji 4s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
        }

        @media (max-width: 768px) {
          .floating-emoji {
            font-size: 1.2rem;
            opacity: 0.3;
          }
          .floating-emoji:nth-child(5),
          .floating-emoji:nth-child(6),
          .floating-emoji:nth-child(7) {
            display: none;
          }
        }
      `}</style>
    </main>
  )
}