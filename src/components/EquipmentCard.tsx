import { Link } from 'react-router-dom'
import { Star, MapPin, Calendar, Clock } from 'lucide-react'
import type { Equipment } from '../types'

export default function EquipmentCard({ equipment }: { equipment: Equipment }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="relative h-48 overflow-hidden">
        <img
          src={equipment.images[0] || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'}
          alt={equipment.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1">
          <div className="flex items-center text-yellow-500">
            <Star size={16} className="fill-current" />
            <span className="ml-1 text-sm font-medium">4.8</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">{equipment.name}</h3>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-blue-600">
              ${equipment.price_day}<span className="text-sm font-normal text-gray-500">/day</span>
            </span>
            <span className="text-sm text-gray-500">
              ${equipment.price_hour}<span className="text-xs">/hour</span>
            </span>
          </div>
        </div>
        <p className="mt-2 text-gray-600 line-clamp-2">{equipment.description}</p>
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <MapPin size={14} className="mr-1" />
          <span>{equipment.location}</span>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center text-sm text-gray-500">
            <Clock size={14} className="mr-1" />
            <span>Available now</span>
          </div>
          <Link
            to={`/equipment/${equipment.id}`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}
