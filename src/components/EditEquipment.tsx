import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { X, Check, AlertCircle } from 'lucide-react'
import classNames from 'classnames'
import type { Equipment } from '../types'

export default function EditEquipment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_hour: 0,
    price_day: 0,
    price_week: 0,
    price_month: 0,
    location: '',
    status: 'available',
    images: [] as string[]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchEquipment = async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching equipment:', error)
        navigate('/owner-dashboard')
        return
      }

      setEquipment(data)
      setFormData({
        name: data.name,
        description: data.description,
        price_hour: data.price_hour,
        price_day: data.price_day,
        price_week: data.price_week,
        price_month: data.price_month,
        location: data.location,
        status: data.status,
        images: data.images || []
      })
    }

    fetchEquipment()
  }, [id, navigate])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.location.trim()) newErrors.location = 'Location is required'
    if (formData.price_hour <= 0) newErrors.price_hour = 'Hourly price must be greater than 0'
    if (formData.price_day <= 0) newErrors.price_day = 'Daily price must be greater than 0'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (!id) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          name: formData.name,
          description: formData.description,
          price_hour: formData.price_hour,
          price_day: formData.price_day,
          price_week: formData.price_week,
          price_month: formData.price_month,
          location: formData.location,
          status: formData.status
        })
        .eq('id', id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => navigate('/owner-dashboard'), 1500)
    } catch (error) {
      console.error('Error updating equipment:', error)
      setErrors({
        ...errors,
        form: 'Failed to update equipment. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price_') ? parseFloat(value) || 0 : value
    }))
  }

  if (!equipment) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="flex-1 p-6 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Edit Equipment</h1>
          <p className="mt-1 text-gray-600">Update the details of your equipment listing</p>
        </div>

        {errors.form && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{errors.form}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="mt-1 text-sm text-green-700">
                Equipment updated successfully! Redirecting to dashboard...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={classNames(
                      'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                      { 'border-red-300': errors.name }
                    )}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className={classNames(
                      'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                      { 'border-red-300': errors.description }
                    )}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label htmlFor="price_hour" className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="price_hour"
                      name="price_hour"
                      min="0"
                      step="0.01"
                      value={formData.price_hour}
                      onChange={handleChange}
                      className={classNames(
                        'block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                        { 'border-red-300': errors.price_hour }
                      )}
                    />
                  </div>
                  {errors.price_hour && <p className="mt-1 text-sm text-red-600">{errors.price_hour}</p>}
                </div>

                <div>
                  <label htmlFor="price_day" className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Rate *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="price_day"
                      name="price_day"
                      min="0"
                      step="0.01"
                      value={formData.price_day}
                      onChange={handleChange}
                      className={classNames(
                        'block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                        { 'border-red-300': errors.price_day }
                      )}
                    />
                  </div>
                  {errors.price_day && <p className="mt-1 text-sm text-red-600">{errors.price_day}</p>}
                </div>

                <div>
                  <label htmlFor="price_week" className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Rate
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="price_week"
                      name="price_week"
                      min="0"
                      step="0.01"
                      value={formData.price_week}
                      onChange={handleChange}
                      className="block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="price_month" className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rate
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="price_month"
                      name="price_month"
                      min="0"
                      step="0.01"
                      value={formData.price_month}
                      onChange={handleChange}
                      className="block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Location & Status</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={classNames(
                      'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                      { 'border-red-300': errors.location }
                    )}
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                    <option value="repair">In Repair</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/owner-dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
