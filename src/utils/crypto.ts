import { supabase } from '../../supabaseClient'

// Simplified encryption using Supabase's built-in functions
// In production, consider using WebCrypto API or a dedicated library

export async function encryptMessage(content: string): Promise<string> {
  // In a real implementation, this would use proper encryption
  // For demo purposes, we're just encoding to base64
  return btoa(unescape(encodeURIComponent(content)))
}

export async function decryptMessage(encrypted: string): Promise<string> {
  // In a real implementation, this would use proper decryption
  // For demo purposes, we're just decoding from base64
  return decodeURIComponent(escape(atob(encrypted)))
}
