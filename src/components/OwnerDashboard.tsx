import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Bell, Users, DollarSign, Activity, AlertCircle, Settings, Calendar, Clock, Package, Plus, MapPin } from 'lucide-react'
import type { Profile, Equipment, Rental, Notification } from '../types'
import { useNavigate } from 'react-router-dom'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function OwnerDashboard() {
  const [kpis, setKpis] = useState({
    revenue: 0,
    activeUsers: 0,
    conversionRate: 0,
    equipmentCount: 0,
    activeRentals: 0
  })
  const [users, setUsers] = useState<Profile[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)

      // Fetch KPIs
      const { data: revenueData } = await supabase
        .from('rentals')
        .select('total_price')
        .eq('status', 'completed')

      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')

      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('*')
        .eq('owner_id', (await supabase.auth.getUser()).data.user?.id)

      const { data: rentalsData } = await supabase
        .from('rentals')
        .select('*')
        .in('status', ['confirmed', 'pending'])

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false })

      // Calculate KPIs
      const revenue = revenueData?.reduce((sum, item) => sum + item.total_price, 0) || 0
      const activeUsers = usersData?.filter(u => u.role === 'user').length || 0
      const conversionRate = ((rentalsData?.length || 0) / (usersData?.length || 1)) * 100
      const equipmentCount = equipmentData?.length || 0
      const activeRentals = rentalsData?.length || 0

      setKpis({
        revenue,
        activeUsers,
        conversionRate,
        equipmentCount,
        activeRentals
      })

      setUsers(usersData || [])
      setEquipment(equipmentData || [])
      setRentals(rentalsData || [])
      setNotifications(notificationsData || [])
      setUnreadNotifications(notificationsData?.filter(n => !n.read).length || 0)
      setLoading(false)
    }

    fetchDashboardData()

    // Set up real-time subscriptions
    const setupSubscriptions = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      const usersSubscription = supabase
        .channel('profiles_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
          setUsers(prev => [...prev.filter(u => u.id !== payload.new.id), payload.new])
        })
        .subscribe()

      const equipmentSubscription = supabase
        .channel('equipment_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'equipment',
          filter: `owner_id=eq.${user.id}`
        }, payload => {
          setEquipment(prev => [...prev.filter(e => e.id !== payload.new.id), payload.new])
        })
        .subscribe()

      const rentalsSubscription = supabase
        .channel('rentals_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' }, payload => {
          setRentals(prev => [...prev.filter(r => r.id !== payload.new.id), payload.new])
        })
        .subscribe()

      const notificationsSubscription = supabase
        .channel('notifications_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, payload => {
          setNotifications(prev => [payload.new, ...prev.filter(n => n.id !== payload.new.id)])
          if (!payload.new.read) {
            setUnreadNotifications(prev => prev + 1)
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(usersSubscription)
        supabase.removeChannel(equipmentSubscription)
        supabase.removeChannel(rentalsSubscription)
        supabase.removeChannel(notificationsSubscription)
      }
    }

    const unsubscribePromise = setupSubscriptions()

    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe?.())
    }
  }, [])

  const markNotificationAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    setUnreadNotifications(prev => prev - 1)
  }

  const updateRentalStatus = async (id: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    await supabase
      .from('rentals')
      .update({ status })
      .eq('id', id)
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Revenue</p>
              <h3 className="text-2xl font-bold">${kpis.revenue.toFixed(2)}</h3>
            </div>
            <DollarSign className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Active Users</p>
              <h3 className="text-2xl font-bold">{kpis.activeUsers}</h3>
            </div>
            <Users className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Conversion</p>
              <h3 className="text-2xl font-bold">{kpis.conversionRate.toFixed(1)}%</h3>
            </div>
            <Activity className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Equipment</p>
              <h3 className="text-2xl font-bold">{kpis.equipmentCount}</h3>
            </div>
            <Package className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Active Rentals</p>
              <h3 className="text-2xl font-bold">{kpis.activeRentals}</h3>
            </div>
            <Calendar className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-4">Recent Rentals</h3>
          <div className="space-y-4">
            {rentals.slice(0, 5).map(rental => (
              <div key={rental.id} className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">#{rental.id.slice(0, 8)}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${rental.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    rental.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {rental.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>${rental.total_price.toFixed(2)}</span>
                  <span>{new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-4">Revenue Chart</h3>
          <div className="h-64">
            <Line
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                  label: 'Revenue',
                  data: [1200, 1900, 3000, 5000, 2000, 3000],
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.5)',
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderRentals = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rentals.map(rental => {
            const equipmentItem = equipment.find(e => e.id === rental.equipment_id)
            const user = users.find(u => u.id === rental.user_id)

            return (
              <tr key={rental.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{rental.id.slice(0, 8)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {equipmentItem?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user?.full_name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${rental.total_price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${rental.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    rental.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {rental.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {rental.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateRentalStatus(rental.id, 'confirmed')}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateRentalStatus(rental.id, 'cancelled')}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {rental.status === 'confirmed' && new Date(rental.end_date) < new Date() && (
                    <button
                      onClick={() => updateRentalStatus(rental.id, 'completed')}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const renderNotifications = () => (
    <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
          onClick={() => markNotificationAsRead(notification.id)}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
              <Bell size={18} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h4 className="font-medium">{notification.message}</h4>
                <span className="text-xs text-gray-500">
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {notification.type === 'new_rental' && 'New rental request received'}
                {notification.type === 'rental_confirmed' && 'Rental payment confirmed'}
              </p>
            </div>
          </div>
        </div>
      ))}
      {notifications.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No notifications yet
        </div>
      )}
    </div>
  )

  const renderEquipment = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Equipment</h2>
        <button
          onClick={() => navigate('/listings/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Add Listing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative h-48">
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Package size={40} className="text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'available' ? 'bg-green-100 text-green-800' :
                  item.status === 'rented' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                  {item.status}
                </span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{item.name}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <p className="text-gray-500 text-sm">Hourly Rate</p>
                  <p className="font-medium">${item.price_hour.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Daily Rate</p>
                  <p className="font-medium">${item.price_day.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{item.tracking_type === 'bulk' ? `${item.quantity} units` : 'Serial tracking'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={16} />
                  <span>{item.location}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate(`/edit-equipment/${item.id}`)}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/equipment/${item.id}`)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 text-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}

        {equipment.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Equipment Yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first piece of equipment</p>
            <button
              onClick={() => navigate('/add-listing')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Equipment
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Owner Dashboard</h1>
        <div className="relative">
          <button
            className="p-2 rounded-full hover:bg-gray-100 relative"
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'dashboard'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('rentals')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rentals'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Rentals
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'equipment'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Equipment
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'notifications'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Notifications
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'rentals' && renderRentals()}
          {activeTab === 'equipment' && renderEquipment()}
          {activeTab === 'notifications' && renderNotifications()}
        </>
      )}
    </div>
  )
}
