import { randomUUID } from 'expo-crypto';

/**
 * Tek kimlik üreticisi. Hermes'te `crypto.randomUUID` garanti değil;
 * expo-crypto hem native hem web'de aynı davranır.
 */
export function newId(): string {
  return randomUUID();
}
