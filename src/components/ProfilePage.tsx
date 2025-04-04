import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { User, LogOut, Edit } from 'lucide-react'
import classNames from 'classnames'

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    avatar_url: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (error) throw error
          if (data) setProfile(data)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update(profile)
          .eq('id', user.id)

        if (error) throw error
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8 lg:p-10 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your account information and settings
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-sm hover:bg-blue-700 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={profile.full_name}
                      onChange={handleInputChange}
                      className="block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded-md">{profile.full_name || 'Not provided'}</div>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="p-2 bg-gray-50 rounded-md">{profile.email}</div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profile.phone}
                      onChange={handleInputChange}
                      className="block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded-md">{profile.phone || 'Not provided'}</div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    value={profile.bio}
                    onChange={handleInputChange}
                    className="block w-full rounded-md shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md whitespace-pre-line">
                    {profile.bio || 'No bio provided'}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isLoading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
