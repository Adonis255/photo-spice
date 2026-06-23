'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'supersexy2025'

type Listing = {
  id: string
  name: string
  description: string
  category: string
  photo_price_kes: number
  number_price_kes: number
  phone_number: string
  image_url: string
  created_at: string
  is_blurred?: boolean
  is_number_locked?: boolean
}

export default function AdminPage() {
  // ALL HOOKS FIRST
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [fetching, setFetching] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('female')
  const [photoPrice, setPhotoPrice] = useState('')
  const [numberPrice, setNumberPrice] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [isBulkUpload, setIsBulkUpload] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPhotoPrice, setEditPhotoPrice] = useState('')
  const [editNumberPrice, setEditNumberPrice] = useState('')
  const [editPhoneNumber, setEditPhoneNumber] = useState('')
  const [editIsBlurred, setEditIsBlurred] = useState(false)
  const [editIsNumberLocked, setEditIsNumberLocked] = useState(false)

  const [categories, setCategories] = useState(['male', 'female', 'international', 'local'])
  const [newCategory, setNewCategory] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  // useEffect BEFORE early return
  useEffect(() => {
    if (isAuthenticated) {
      fetchListings()
    }
  }, [isAuthenticated])

  // Early Return
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
            className="w-full p-3 border border-gray-300 rounded-xl mt-4 text-gray-900 bg-white"
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

  // ----- FUNCTIONS (with full error logging & local state updates) -----
  const fetchListings = async () => {
    setFetching(true)
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      console.log('📋 Fetched listings count:', data?.length)
      setListings(data || [])
    } catch (err) {
      toast.error('Failed to fetch listings: ' + (err as Error).message)
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) return toast.error('Please select an image')
    if (!photoPrice || !numberPrice) return toast.error('Enter both prices')
    setLoading(true)
    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, imageFile)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
      const imageUrl = urlData.publicUrl
      // @ts-ignore
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
      if (insertError) throw insertError
      toast.success('🔥 Photo uploaded successfully!')
      resetForm()
      fetchListings()
    } catch (err) {
      toast.error('Failed to upload: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (imageFiles.length === 0) return toast.error('Select at least one image')
    if (!photoPrice || !numberPrice) return toast.error('Enter both prices')
    setLoading(true)
    let successCount = 0, failCount = 0
    for (const file of imageFiles) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
        const imageUrl = urlData.publicUrl
        // @ts-ignore
        const { error: insertError } = await supabase
          .from('listings')
          .insert({
            name: file.name.split('.')[0] || 'Untitled',
            description,
            category,
            photo_price_kes: parseInt(photoPrice),
            number_price_kes: parseInt(numberPrice),
            phone_number: phoneNumber,
            image_url: imageUrl,
          } as any)
        if (insertError) throw insertError
        successCount++
      } catch (err) {
        failCount++
        console.error('Bulk upload failed for:', file.name, err)
      }
    }
    toast.success(`✅ Uploaded ${successCount} photos${failCount > 0 ? `, ${failCount} failed` : ''}`)
    setLoading(false)
    setImageFiles([])
    fetchListings()
  }

  // --- DELETION ---
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    try {
      console.log('🗑️ Deleting listing:', id)
      const { error } = await supabase.from('listings').delete().eq('id', id)
      if (error) {
        console.error('Delete error:', error)
        throw error
      }
      toast.success('🗑️ Listing deleted successfully!')
      fetchListings()
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error('Failed to delete: ' + (err as Error).message)
    }
  }

  // --- TOGGLE BLUR (with local state update) ---
  const toggleBlur = async (id: string, currentBlur: boolean) => {
    try {
      const newValue = !currentBlur
      console.log('🔀 Toggling blur for:', id, 'current:', currentBlur, 'new:', newValue)

      const result = await supabase
        .from('listings')
        .update({ is_blurred: newValue })
        .eq('id', id)
        .select()

      if (result.error) {
        console.error('❌ Toggle blur error:', result.error)
        toast.error('Failed to toggle blur: ' + result.error.message)
        return
      }

      console.log('✅ Update successful:', result.data)

      // 🔥 Update local state immediately
      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id ? { ...listing, is_blurred: newValue } : listing
        )
      )

      toast.success(`Photo ${newValue ? 'blurred' : 'unblurred'}!`)
      // Sync with server (optional)
      await fetchListings()
    } catch (err) {
      console.error('❌ Toggle blur exception:', err)
      toast.error('Failed to toggle blur: ' + (err as Error).message)
    }
  }

  // --- TOGGLE NUMBER LOCK (with local state update) ---
  const toggleNumberLock = async (id: string, currentLock: boolean) => {
    try {
      const newValue = !currentLock
      console.log('🔀 Toggling number lock for:', id, 'current:', currentLock, 'new:', newValue)

      const result = await supabase
        .from('listings')
        .update({ is_number_locked: newValue })
        .eq('id', id)
        .select()

      if (result.error) {
        console.error('❌ Toggle number lock error:', result.error)
        toast.error('Failed to toggle number lock: ' + result.error.message)
        return
      }

      console.log('✅ Update successful:', result.data)

      // 🔥 Update local state immediately
      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id ? { ...listing, is_number_locked: newValue } : listing
        )
      )

      toast.success(`Number ${newValue ? 'locked' : 'unlocked'}!`)
      await fetchListings()
    } catch (err) {
      console.error('❌ Toggle number lock exception:', err)
      toast.error('Failed to toggle number lock: ' + (err as Error).message)
    }
  }

  // --- EDIT ---
  const startEdit = (listing: Listing) => {
    setEditingId(listing.id)
    setEditName(listing.name)
    setEditDescription(listing.description || '')
    setEditCategory(listing.category)
    setEditPhotoPrice(listing.photo_price_kes.toString())
    setEditNumberPrice(listing.number_price_kes.toString())
    setEditPhoneNumber(listing.phone_number)
    setEditIsBlurred(listing.is_blurred || false)
    setEditIsNumberLocked(listing.is_number_locked !== false)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setLoading(true)
    try {
      console.log('💾 Saving edit for:', editingId)
      const updates = {
        name: editName,
        description: editDescription,
        category: editCategory,
        photo_price_kes: parseInt(editPhotoPrice),
        number_price_kes: parseInt(editNumberPrice),
        phone_number: editPhoneNumber,
        is_blurred: editIsBlurred,
        is_number_locked: editIsNumberLocked,
      }
      console.log('Update payload:', updates)
      const { data, error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', editingId)
        .select()
      if (error) {
        console.error('Update error:', error)
        throw error
      }
      console.log('Update result:', data)
      toast.success('✅ Listing updated successfully!')
      setEditingId(null)
      fetchListings()
    } catch (err) {
      console.error('Save edit failed:', err)
      toast.error('Failed to update: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // --- Category management ---
  const addCategory = async () => {
    if (!newCategory.trim()) return toast.error('Enter a category name')
    if (categories.includes(newCategory.trim())) return toast.error('Category already exists')
    setIsAddingCategory(true)
    try {
      setCategories([...categories, newCategory.trim()])
      setNewCategory('')
      toast.success(`✅ Category "${newCategory.trim()}" added!`)
    } catch (err) {
      toast.error('Failed to add category: ' + (err as Error).message)
    } finally {
      setIsAddingCategory(false)
    }
  }

  const removeCategory = async (cat: string) => {
    if (['male', 'female', 'international'].includes(cat)) {
      return toast.error('Cannot remove default category')
    }
    if (!confirm(`Remove category "${cat}"?`)) return
    try {
      setCategories(categories.filter(c => c !== cat))
      toast.success(`✅ Category "${cat}" removed!`)
    } catch (err) {
      toast.error('Failed to remove category: ' + (err as Error).message)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setPhotoPrice('')
    setNumberPrice('')
    setPhoneNumber('')
    setImageFile(null)
    setImageFiles([])
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  // ----- JSX -----
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto mb-4 flex flex-wrap justify-between items-center bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-pink-100">
        <h2 className="font-bold text-gray-700">👑 Admin Control</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setIsBulkUpload(!isBulkUpload); resetForm() }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isBulkUpload ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            📦 Bulk Upload
          </button>
          <button onClick={fetchListings} className="px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold hover:bg-blue-200 transition-all">
            🔄 Refresh
          </button>
          <a href="/" target="_blank" className="px-4 py-2 bg-pink-100 text-pink-600 rounded-full text-sm font-semibold hover:bg-pink-200 transition-all">
            🏠 View Live Gallery
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upload Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">
            {isBulkUpload ? '📦 Bulk Upload' : '👑 Add New Spice'}
          </h1>
          <form onSubmit={isBulkUpload ? handleBulkUpload : handleSubmit} className="space-y-4">
            {!isBulkUpload && (
              <input
                type="text"
                placeholder="Name (e.g., Jessica)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white"
                required
              />
            )}
            <textarea
              placeholder="Description (e.g., Model from Nairobi)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 h-20 text-gray-900 bg-white"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Photo Price (KES)"
                value={photoPrice}
                onChange={(e) => setPhotoPrice(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white"
                required
              />
              <input
                type="number"
                placeholder="Number Price (KES)"
                value={numberPrice}
                onChange={(e) => setNumberPrice(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Phone Number (e.g., +254 712 345 678)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white"
              required
            />
            {isBulkUpload ? (
              <div className="border-2 border-dashed border-purple-300 rounded-xl p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files
                    if (files) {
                      setImageFiles(Array.from(files))
                      toast.success(`📸 ${files.length} images selected`)
                    }
                  }}
                  className="w-full text-gray-900"
                  required
                />
                {imageFiles.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">{imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected</p>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-pink-300 rounded-xl p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-gray-900"
                  required
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-pink-200 transition-all disabled:opacity-50"
            >
              {loading ? 'Uploading...' : isBulkUpload ? '📦 Upload All' : '💋 Publish to Gallery'}
            </button>
          </form>
        </div>

        {/* Category Management */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">🏷️ Manage Categories</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white"
            />
            <button
              onClick={addCategory}
              disabled={isAddingCategory}
              className="px-4 py-3 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 transition-all disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat}
                className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                  ['male', 'female', 'international'].includes(cat)
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-pink-100 text-pink-700'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                {!['male', 'female', 'international'].includes(cat) && (
                  <button onClick={() => removeCategory(cat)} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">* Default categories cannot be removed</p>
        </div>
      </div>

      {/* Listings Table */}
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">📋 Manage Listings ({listings.length})</h2>
        {fetching ? (
          <div className="text-center py-8">Loading listings...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No listings found. Upload some photos!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Photo</th>
                  <th className="text-left py-3 px-2">Name</th>
                  <th className="text-left py-3 px-2 hidden md:table-cell">Category</th>
                  <th className="text-left py-3 px-2 hidden sm:table-cell">Prices</th>
                  <th className="text-left py-3 px-2">Blur</th>
                  <th className="text-left py-3 px-2">Number</th>
                  <th className="text-left py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-b hover:bg-gray-50 transition-all">
                    <td className="py-3 px-2">
                      <img src={listing.image_url} alt={listing.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-200" />
                    </td>
                    <td className="py-3 px-2 font-semibold text-gray-900">{listing.name}</td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">{listing.category}</span>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell text-gray-700">
                      <span className="text-xs">Photo: KSh {listing.photo_price_kes}</span><br />
                      <span className="text-xs">Number: KSh {listing.number_price_kes}</span>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => {
                          console.log('🖱️ Blur button clicked for:', listing.id);
                          toggleBlur(listing.id, listing.is_blurred || false);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          listing.is_blurred ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {listing.is_blurred ? '🔒 Blurred' : '👁️ Unblurred'}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => {
                          console.log('🖱️ Number button clicked for:', listing.id);
                          toggleNumberLock(listing.id, listing.is_number_locked !== false);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          listing.is_number_locked !== false ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {listing.is_number_locked !== false ? '🔒 Locked' : '🔓 Unlocked'}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(listing)} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs hover:bg-blue-200 transition-all">✏️</button>
                        <button onClick={() => handleDelete(listing.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs hover:bg-red-200 transition-all">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">✏️ Edit Listing</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white" />
              <textarea placeholder="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 h-20 text-gray-900 bg-white" />
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white">
                {categories.map((cat) => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Photo Price (KES)" value={editPhotoPrice} onChange={(e) => setEditPhotoPrice(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white" />
                <input type="number" placeholder="Number Price (KES)" value={editNumberPrice} onChange={(e) => setEditNumberPrice(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white" />
              </div>
              <input type="text" placeholder="Phone Number" value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-gray-900 bg-white" />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-gray-700">
                  <input type="checkbox" checked={editIsBlurred} onChange={(e) => setEditIsBlurred(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Blur Photo</span>
                </label>
                <label className="flex items-center gap-2 text-gray-700">
                  <input type="checkbox" checked={editIsNumberLocked} onChange={(e) => setEditIsNumberLocked(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Lock Number</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={saveEdit} disabled={loading} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-pink-200 transition-all disabled:opacity-50">💾 Save Changes</button>
                <button onClick={() => setEditingId(null)} className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-duration: 0.2s; animation-fill-mode: forwards; }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  )
}