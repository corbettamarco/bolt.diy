import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Chat from './Chat'

interface Conversation {
  id: string
  created_at: string
  participant_ids: string[]
  last_message?: string
  last_message_at?: string
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .contains('participant_ids', [user.id])
          .order('last_message_at', { ascending: false })

        if (error) throw error

        setConversations(data || [])
        if (data && data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0].id)
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    const subscription = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_ids=cs.{${user.id}}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as Conversation, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === payload.new.id ? (payload.new as Conversation) : conv
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user, selectedConversation])

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-1/3 border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${selectedConversation === conversation.id ? 'bg-blue-50' : ''
                }`}
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  {conversation.participant_ids
                    .filter((id) => id !== user?.id)
                    .map((id) => (
                      <span key={id} className="font-medium">
                        {id} {/* Replace with actual user name */}
                      </span>
                    ))}
                </div>
                <span className="text-sm text-gray-500">
                  {conversation.last_message_at
                    ? new Date(conversation.last_message_at).toLocaleTimeString()
                    : ''}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {conversation.last_message || 'No messages yet'}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="w-2/3">
        {selectedConversation && user ? (
          <Chat conversationId={selectedConversation} userId={user.id} />
        ) : (
          <div className="flex justify-center items-center h-full">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}
