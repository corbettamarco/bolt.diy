import { colors } from './colors'

export const chatStyles = {
  container: 'flex flex-col h-full',
  messagesContainer: 'flex-1 overflow-y-auto p-4 space-y-4',
  messageBubble: (isOwn: boolean) => 
    `max-w-xs md:max-w-md rounded-lg p-3 ${isOwn ? 'bg-[${colors.primary}] text-white' : 'bg-gray-200 text-gray-800'}`,
  inputContainer: 'border-t p-4',
  filePreview: 'flex items-center justify-between mb-2 bg-gray-100 p-2 rounded',
  inputWrapper: 'flex items-center space-x-2',
  fileInput: 'cursor-pointer p-2 rounded-full hover:bg-gray-100',
  textInput: 'flex-1 border rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-[${colors.primary}]',
  sendButton: 'p-2 rounded-full bg-[${colors.primary}] text-white hover:bg-[${colors.primaryDark}] disabled:opacity-50',
  fileLink: 'text-sm underline'
}
