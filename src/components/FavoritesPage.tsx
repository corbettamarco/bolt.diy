import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Equipment } from '../types'
import { Heart, Filter, ArrowUpDown, List, Grid } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true)
        const user = supabase.auth.user()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('favorites')
          .select('equipment(*)')
          .eq('user_id', user.id)

        if (error) throw error
        setFavorites(data?.map(fav => fav.equipment) || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [])

  const handleRemoveFavorites = async (ids: string[]) => {
    try {
      const user = supabase.auth.user()
      if (!user) return

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .in('equipment_id', ids)

      if (error) throw error

      setFavorites(favorites.filter(item => !ids.includes(item.id)))
      setSelectedItems([])
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === favorites.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(favorites.map(item => item.id))
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Favorites</h1>

        <div className="flex space-x-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            aria-label="Grid view"
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            aria-label="List view"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedItems.length === favorites.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {selectedItems.length} selected
            </span>
          </div>
          <button
            onClick={() => handleRemoveFavorites(selectedItems)}
            className="text-sm font-medium text-red-600 hover:text-red-800 flex items-center"
          >
            <Heart size={16} className="mr-1" fill="currentColor" />
            Remove selected
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option>Sort by</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Rating</option>
            <option>Distance</option>
          </select>
          <ArrowUpDown size={16} className="absolute right-3 top-2.5 text-gray-400" />
        </div>

        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option>Filter by</option>
            <option>Category</option>
            <option>Price Range</option>
            <option>Availability</option>
          </select>
          <Filter size={16} className="absolute right-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Empty state */}
      {favorites.length === 0 && (
        <div className="text-center py-12">
          <Heart size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No favorites yet</h3>
          <p className="mt-2 text-gray-500">
            Save items you love by clicking the heart icon on any listing.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Browse Listings
          </Link>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && favorites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map(item => (
            <FavoriteCard
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={toggleSelectItem}
              onRemove={() => handleRemoveFavorites([item.id])}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && favorites.length > 0 && (
        <div className="space-y-4">
          {favorites.map(item => (
            <FavoriteListItem
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={toggleSelectItem}
              onRemove={() => handleRemoveFavorites([item.id])}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FavoriteCard({
  item,
  isSelected,
  onSelect,
  onRemove
}: {
  item: Equipment
  isSelected: boolean
  onSelect: (id: string) => void
  onRemove: () => void
}) {
  return (
    <div className="relative group">
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>
      <Link
        to={`/items/${item.id}`}
        className="block rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="aspect-w-16 aspect-h-9 bg-gray-100 overflow-hidden relative">
          <img
            src={item.images[0]}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md text-red-500 hover:text-red-700"
            aria-label="Remove from favorites"
          >
            <Heart size={20} fill="currentColor" />
          </button>
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900">{item.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{item.category}</p>
          <p className="mt-2 font-semibold text-gray-900">
            ${item.price_day?.toFixed(2)} / day
          </p>
        </div>
      </Link>
    </div>
  )
}

function FavoriteListItem({
  item,
  isSelected,
  onSelect,
  onRemove
}: {
  item: Equipment
  isSelected: boolean
  onSelect: (id: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center p-4 border rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0 mr-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>
      <Link
        to={`/items/${item.id}`}
        className="flex-1 flex items-center"
      >
        <div className="flex-shrink-0 h-20 w-20 rounded-md overflow-hidden bg-gray-100">
          <img
            src={item.images[0]}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="ml-4 flex-1">
          <h3 className="font-medium text-gray-900">{item.name}</h3>
          <p className="text-sm text-gray-500">{item.category}</p>
          <p className="mt-1 font-semibold text-gray-900">
            ${item.price_day?.toFixed(2)} / day
          </p>
        </div>
      </Link>
      <button
        onClick={onRemove}
        className="ml-4 p-2 text-red-500 hover:text-red-700"
        aria-label="Remove from favorites"
      >
        <Heart size={20} fill="currentColor" />
      </button>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{message}</p>
        </div>
      </div>
    </div>
  )
}
