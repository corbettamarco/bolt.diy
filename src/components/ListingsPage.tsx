import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import EquipmentCard from './EquipmentCard'
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import type { Equipment } from '../types'

const categories = [
  'All',
  'Cycling',
  'Water Sports',
  'Winter Sports',
  'Camping',
  'Fitness',
  'Other'
]

export default function ListingsPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState([0, 500])

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true)
      let query = supabase
        .from('equipment')
        .select('*')
        .eq('status', 'available')

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory)
      }

      query = query.gte('price_day', priceRange[0])
      query = query.lte('price_day', priceRange[1])

      const { data, error } = await query

      if (error) {
        console.error('Error fetching equipment:', error)
      } else {
        setEquipment(data || [])
      }
      setLoading(false)
    }

    fetchEquipment()
  }, [searchTerm, selectedCategory, priceRange])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rent Sports Equipment</h1>
        <p className="text-gray-600">Find the perfect gear for your next adventure</p>
      </div>

      <div className="mb-8">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <Filter size={18} className="mr-2" />
          Filters
          {showFilters ? <ChevronUp size={18} className="ml-1" /> : <ChevronDown size={18} className="ml-1" />}
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-sm rounded-full ${selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Price Range (per day)</h3>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
                <span className="text-sm font-medium">${priceRange[0]} - ${priceRange[1]}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No equipment found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => (
            <EquipmentCard key={item.id} equipment={item} />
          ))}
        </div>
      )}
    </div>
  )
}
