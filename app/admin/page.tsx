'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'supersexy2025'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('female')
  const [photoPrice, setPhotoPrice] = useState('')
  const [numberPrice, setNumberPrice] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-80">
          <h2 className="text-2xl font-bold text-center text-gray-800">🔑 Admin Access</h2>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl mt-4"
          />
          <button
            onClick={() => {
              if (password === ADMIN_PASSWORD) setIsAuthenticated(true)
              else toast.error('Wrong password')
            }}
            className="w-full bg-pink-500 text-white py-3 rounded-xl mt-4 font-bold"
          >
            Unlock
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) return toast.error('Please select an image')
    if (!photoPrice || !numberPrice) return toast.error('Enter both prices')

    setLoading(true)

    // 1. Upload image to Supabase Storage
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, imageFile)

    if (uploadError) {
      toast.error('Image upload failed: ' + uploadError.message)
      setLoading(false)
      return
    }

    // 2. Get public URL
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    // 3. Insert into listings table
    const { error: insertError } = await supabase
      .from('listings')
      .insert({
        name,
        description,
        category,
        photo_price_kes: parseInt(photoPrice),
        number_price_kes: parseInt(numberPrice),
        phone_number: phoneNumber,
        image_url: imageUrl,
      } as any)

    if (insertError) {
      toast.error('Failed to save listing: ' + insertError.message)
    } else {
      toast.success('🔥 Photo uploaded successfully!')
      // Reset form
      setName('')
      setDescription('')
      setPhotoPrice('')
      setNumberPrice('')
      setPhoneNumber('')
      setImageFile(null)
      // Reset file input visually
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
      {/* 🔥 NEW: Navigation Bar with "View Live Gallery" button */}
      <div className="max-w-2xl mx-auto mb-4 flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-pink-100">
        <h2 className="font-bold text-gray-700">👑 Admin Control</h2>
        <a
          href="/"
          target="_blank"
          className="px-4 py-2 bg-pink-100 text-pink-600 rounded-full text-sm font-semibold hover:bg-pink-200 transition-all"
        >
          🏠 View Live Gallery
        </a>
      </div>

      {/* The Admin Form */}
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">
          👑 Admin - Add New Spice
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name (e.g., Jessica)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300"
            required
          />

          <textarea
            placeholder="Description (e.g., Model from Nairobi)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 h-20"
            required
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="international">International</option>
            <option value="local">Local</option>
          </select>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Photo Price (KES)"
              value={photoPrice}
              onChange={(e) => setPhotoPrice(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300"
              required
            />
            <input
              type="number"
              placeholder="Number Price (KES)"
              value={numberPrice}
              onChange={(e) => setNumberPrice(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300"
              required
            />
          </div>

          <input
            type="text"
            placeholder="Phone Number (e.g., +254 712 345 678)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300"
            required
          />

          <div className="border-2 border-dashed border-pink-300 rounded-xl p-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-pink-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Uploading...' : '💋 Publish to Gallery'}
          </button>
        </form>
      </div>
    </div>
  )
}