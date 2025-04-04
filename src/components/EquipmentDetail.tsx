import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Star, MapPin, Calendar, Clock } from 'lucide-react'
import RentalCheckout from './RentalCheckout'
import { useNavigate } from 'react-router-dom'
import type { Equipment } from '../types'

export default function EquipmentDetail({ id }: { id: string }) {
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()

    const fetchEquipment = async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .single()

      if (error) console.error('Error fetching equipment:', error)
      else setEquipment(data)
      setLoading(false)
    }

    fetchEquipment()
  }, [id])

  const handleRentalClick = () => {
    if (!isLoggedIn) {
      navigate('/login')
    } else {
      navigate('/checkout')
    }
  }

  if (loading) return <div>Loading...</div>
  if (!equipment) return <div>Equipment not found</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <img
              src={equipment.images[0]}
              alt={equipment.name}
              className="w-full h-96 object-cover"
            />
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h1 className="text-2xl font-bold mb-4">{equipment.name}</h1>
            <p className="text-gray-700 mb-6">{equipment.description}</p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-gray-500" />
                <span>{equipment.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-500" />
                <span>Available now</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Rental Details</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span>Daily Rate:</span>
                <span className="font-bold">${equipment.price_day}</span>
              </div>
              <div className="flex justify-between">
                <span>Hourly Rate:</span>
                <span className="font-bold">${equipment.price_hour}</span>
              </div>
            </div>
            <button
              onClick={handleRentalClick}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition"
            >
              {isLoggedIn ? 'Rent Now' : 'Login to Rent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
