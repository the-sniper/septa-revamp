
import { supabaseAdmin } from './supabase';
// import type { AuthenticatorDevice } from '@simplewebauthn/typescript-types';

export interface User {
  id: string;
  username: string;
}

export interface UserSecret {
  user_id: string;
  encrypted_data: string;
  iv: string;
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Create a new user
 */
export async function createUser(username: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ username })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data;
}

/**
 * Get authenticator by credential ID
 */
export async function getAuthenticator(credentialID: string) {
  const { data, error } = await supabaseAdmin
    .from('authenticators')
    .select('*')
    .eq('credential_id', credentialID)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get all authenticators for a user
 */
export async function getUserAuthenticators(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('authenticators')
    .select('*')
    .eq('user_id', userId);

  return data || [];
}

/**
 * Save new authenticator
 */
export async function saveAuthenticator(authenticator: any) {
  const { error } = await supabaseAdmin
    .from('authenticators')
    .upsert(authenticator);

  if (error) {
    throw new Error(`Failed to save authenticator: ${error.message}`);
  }
}

/**
 * Save encrypted user secret
 */
export async function saveUserSecret(userId: string, encryptedData: string, iv: string) {
  // Check if secret exists, update it if so
  const { data: existing } = await supabaseAdmin
    .from('user_secrets')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabaseAdmin
      .from('user_secrets')
      .update({ encrypted_data: encryptedData, iv })
      .eq('user_id', userId);
  } else {
    await supabaseAdmin
      .from('user_secrets')
      .insert({ user_id: userId, encrypted_data: encryptedData, iv });
  }
}

/**
 * Get user secret
 */
export async function getUserSecret(userId: string): Promise<UserSecret | null> {
  const { data, error } = await supabaseAdmin
    .from('user_secrets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}
