import { Paperclip, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../supabaseClient'
import { chatStyles } from '../theme/chatStyles'
import { Message } from '../types'
import { decryptMessage, encryptMessage } from '../utils/crypto'

interface ChatProps {
  conversationId: string
  userId: string
}

export default function Chat({ conversationId, userId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      const decryptedMessages = await Promise.all(
        data.map(async (msg) => ({
          ...msg,
          content: await decryptMessage(msg.encrypted_content)
        }))
      )

      setMessages(decryptedMessages)
    }

    fetchMessages()

    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const decrypted = {
            ...payload.new,
            content: await decryptMessage(payload.new.encrypted_content)
          }
          setMessages((prev: any) => [...prev, decrypted])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return

    const messageId = uuidv4()
    const encryptedContent = await encryptMessage(newMessage)
    const fileMetadata = file ? {
      name: file.name,
      type: file.type,
      size: file.size
    } : null

    const { error } = await supabase
      .from('messages')
      .insert([{
        id: messageId,
        conversation_id: conversationId,
        sender_id: userId,
        content: newMessage,
        encrypted_content: encryptedContent,
        type: file ? 'document' : 'text',
        metadata: fileMetadata,
        read: false
      }])

    if (error) {
      console.error('Error sending message:', error)
      return
    }

    setNewMessage('')
    setFile(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit')
        return
      }
      setFile(selectedFile)
    }
  }

  return (
    <div className={chatStyles.container}>
      <div className={chatStyles.messagesContainer}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={chatStyles.messageBubble(message.sender_id === userId)}>
              {message.content}
              {message.metadata && (
                <div className="mt-2">
                  <a
                    href="#"
                    className={chatStyles.fileLink}
                    onClick={() => alert('File download would be implemented here')}
                  >
                    {message.metadata.name}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={chatStyles.inputContainer}>
        {file && (
          <div className={chatStyles.filePreview}>
            <span className="text-sm truncate">{file.name}</span>
            <button onClick={() => setFile(null)}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className={chatStyles.inputWrapper}>
          <label className={chatStyles.fileInput}>
            <Paperclip size={20} />
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
            />
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className={chatStyles.textInput}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && !file}
            className={chatStyles.sendButton}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
