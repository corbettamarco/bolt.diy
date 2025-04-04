import { Link, useLocation } from 'react-router-dom'
import { Home, Plus, MessageSquare, Heart, User, LogOut, Menu, Briefcase, LogIn } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import classNames from 'classnames'
import { useAuth } from '../contexts/AuthContext'

interface NavbarProps {
  className?: string
}

export default function Navbar({ className }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isOwner, signOut } = useAuth()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <Menu size={24} />
      </button>

      {/* Desktop sidebar - always visible */}
      <nav className={classNames(
        "hidden md:flex md:flex-col md:fixed md:top-0 md:left-0 md:h-full md:w-64 bg-blue-600 text-white p-4 z-30",
        className
      )}>
        <Link
          to="/"
          className="text-2xl font-bold mb-8 flex items-center hover:text-blue-100 transition-colors"
        >
          <img
            src="/logo.svg"
            alt="LoNoleggi Logo"
            className="h-10 w-10 mr-3"
          />
          LoNoleggi
        </Link>

        <div className="flex-1 space-y-2">
          <NavLink to="/" icon={<Home size={20} />} label="Home" />
          {user ? (
            <>
              <NavLink to="/listings/new" icon={<Plus size={20} />} label="Add Listing" />
              <NavLink to="/messages" icon={<MessageSquare size={20} />} label="Messages" />
              <NavLink to="/favorites" icon={<Heart size={20} />} label="Favorites" />
              {isOwner && (
                <NavLink to="/owner-dashboard" icon={<Briefcase size={20} />} label="Owner Dashboard" />
              )}
              <NavLink to="/profile" icon={<User size={20} />} label="Profile" />
            </>
          ) : (
            <NavLink to="/login" icon={<LogIn size={20} />} label="Login" />
          )}
        </div>

        {user ? (
          <button
            onClick={handleLogout}
            className="mt-auto flex items-center p-3 rounded-lg hover:bg-blue-700 w-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          >
            <LogOut size={20} className="mr-3" />
            <span>Log Out</span>
          </button>
        ) : null}
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-16 right-0 left-0 bg-blue-600 text-white p-4 flex flex-col shadow-lg">
            <div className="space-y-2">
              <NavLink to="/" icon={<Home size={20} />} label="Home" mobile />
              {user ? (
                <>
                  <NavLink to="/listings/new" icon={<Plus size={20} />} label="Add Listing" mobile />
                  <NavLink to="/messages" icon={<MessageSquare size={20} />} label="Messages" mobile />
                  <NavLink to="/favorites" icon={<Heart size={20} />} label="Favorites" mobile />
                  {isOwner && (
                    <NavLink to="/owner-dashboard" icon={<Briefcase size={20} />} label="Owner Dashboard" mobile />
                  )}
                  <NavLink to="/profile" icon={<User size={20} />} label="Profile" mobile />
                </>
              ) : (
                <NavLink to="/login" icon={<LogIn size={20} />} label="Login" />
              )}
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center p-3 rounded-lg hover:bg-blue-700 w-full transition-colors mt-4"
              >
                <LogOut size={20} className="mr-3" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

interface NavLinkProps {
  to: string
  icon: React.ReactNode
  label: string
  mobile?: boolean
}

function NavLink({ to, icon, label, mobile = false }: NavLinkProps) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={classNames(
        "flex items-center p-3 rounded-lg transition-colors",
        "hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white",
        {
          'bg-blue-800': isActive,
          'w-full': mobile,
        }
      )}
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
