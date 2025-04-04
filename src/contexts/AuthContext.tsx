import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: 'user' | 'owner') => Promise<void>
  signOut: () => Promise<void>
  isOwner: boolean
  validateSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const navigate = useNavigate()

  const validateSession = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession()

      if (error || !currentSession || !currentSession.expires_at) {
        await signOut()
        return false
      }

      // Check if token is expired
      const expiresAt = new Date(currentSession.expires_at * 1000)
      if (expiresAt < new Date()) {
        await signOut()
        return false
      }

      return true
    } catch (err) {
      await signOut()
      return false
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      const isValid = await validateSession()

      // If session is invalid, stop loading
      if (!isValid) {
        setLoading(false)
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
          setIsOwner(false)
          setLoading(false) // Ensure loading is false when signed out
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false) // Stop loading after session is established

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          setIsOwner(profile?.role === 'owner')
        } else {
          setIsOwner(false)
        }
      })

      return () => subscription?.unsubscribe()
    }

    initializeAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: 'user' | 'owner') => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (signUpError) throw signUpError
      if (!user) throw new Error('User creation failed')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email,
          full_name: fullName,
          role
        }])

      if (profileError) throw profileError

      if (!user.identities || user.identities.length === 0) {
        alert('Check your email for the confirmation link!')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setSession(null)
      setIsOwner(false)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign out')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isOwner,
    validateSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
