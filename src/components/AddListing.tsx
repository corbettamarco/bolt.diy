import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Plus, X, Check, AlertCircle } from 'lucide-react'
import classNames from 'classnames'

type FormData = {
  name: string
  description: string
  category_id: string
  price_hour: number
  price_day: number
  price_week: number
  price_month: number
  location: string
  tracking_type: 'bulk' | 'serial'
  quantity: number
  serial_numbers: string[]
  images: string[]
}

type Category = {
  id: string
  name: string
}

export default function AddListing() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category_id: '',
    price_hour: 0,
    price_day: 0,
    price_week: 0,
    price_month: 0,
    location: '',
    tracking_type: 'bulk',
    quantity: 1,
    serial_numbers: [],
    images: []
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newSerial, setNewSerial] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('equipment_categories')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
      } else if (data) {
        setCategories(data)
      }
    }

    fetchCategories()
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.category_id) newErrors.category = 'Category is required'
    if (!formData.location.trim()) newErrors.location = 'Location is required'
    if (formData.price_hour <= 0) newErrors.price_hour = 'Hourly price must be greater than 0'
    if (formData.price_day <= 0) newErrors.price_day = 'Daily price must be greater than 0'
    if (formData.tracking_type === 'bulk' && formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }
    if (formData.tracking_type === 'serial' && formData.serial_numbers.length === 0) {
      newErrors.serial_numbers = 'At least one serial number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('equipment').insert([{
        owner_id: user.id,
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        price_hour: formData.price_hour,
        price_day: formData.price_day,
        price_week: formData.price_week,
        price_month: formData.price_month,
        location: formData.location, // Storing as plain string
        tracking_type: formData.tracking_type,
        quantity: formData.tracking_type === 'bulk' ? formData.quantity : null,
        serial_code: formData.tracking_type === 'serial' ? formData.serial_numbers.join(',') : null,
        status: 'available',
        images: formData.images
      }])

      if (error) throw error

      setSuccess(true)
      setTimeout(() => navigate('/owner-dashboard'), 2000)
    } catch (error) {
      console.error('Error adding listing:', error)
      setErrors({
        ...errors,
        form: 'Failed to add listing. Please try again.'
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

  const handleTrackingTypeChange = (type: 'bulk' | 'serial') => {
    setFormData(prev => ({
      ...prev,
      tracking_type: type,
      quantity: type === 'bulk' ? 1 : 0,
      serial_numbers: type === 'serial' ? [] : prev.serial_numbers
    }))
  }

  const addSerialNumber = () => {
    if (newSerial.trim() && !formData.serial_numbers.includes(newSerial.trim())) {
      setFormData(prev => ({
        ...prev,
        serial_numbers: [...prev.serial_numbers, newSerial.trim()]
      }))
      setNewSerial('')
    }
  }

  const removeSerialNumber = (serial: string) => {
    setFormData(prev => ({
      ...prev,
      serial_numbers: prev.serial_numbers.filter(s => s !== serial)
    }))
  }

  return (
    <div className="flex-1 p-6 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Add New Listing</h1>
          <p className="mt-1 text-gray-600">Fill out the form below to list your equipment for rent</p>
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
                Listing added successfully! Redirecting to dashboard...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className={classNames(
                      'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                      { 'border-red-300': errors.category }
                    )}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                <div className="sm:col-span-2">
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">Location</h2>
              <div className="grid grid-cols-1 gap-6">
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
                    placeholder="Enter location (e.g., New York, NY)"
                    className={classNames(
                      'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                      { 'border-red-300': errors.location }
                    )}
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory Tracking</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => handleTrackingTypeChange('bulk')}
                    className={classNames(
                      'px-4 py-2 rounded-md border text-sm font-medium',
                      formData.tracking_type === 'bulk'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Bulk Tracking
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrackingTypeChange('serial')}
                    className={classNames(
                      'px-4 py-2 rounded-md border text-sm font-medium',
                      formData.tracking_type === 'serial'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Serial Number Tracking
                  </button>
                </div>

                {formData.tracking_type === 'bulk' ? (
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      min="1"
                      value={formData.quantity}
                      onChange={handleChange}
                      className={classNames(
                        'block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500',
                        { 'border-red-300': errors.quantity }
                      )}
                    />
                    {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Numbers *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newSerial}
                        onChange={(e) => setNewSerial(e.target.value)}
                        className="block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter serial number"
                      />
                      <button
                        type="button"
                        onClick={addSerialNumber}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {errors.serial_numbers && (
                      <p className="mt-1 text-sm text-red-600">{errors.serial_numbers}</p>
                    )}

                    {formData.serial_numbers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {formData.serial_numbers.map((serial) => (
                          <div
                            key={serial}
                            className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                          >
                            <span className="text-sm text-gray-800">{serial}</span>
                            <button
                              type="button"
                              onClick={() => removeSerialNumber(serial)}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Listing'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
