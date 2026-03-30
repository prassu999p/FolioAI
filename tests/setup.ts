import { vi } from 'vitest'

// Polyfill Blob.prototype.arrayBuffer() for jsdom 25 which lacks this method.
// Uses FileReader (available in jsdom) to read the blob's data as an ArrayBuffer.
// File extends Blob so File.prototype.arrayBuffer() is also provided by this polyfill.
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as ArrayBuffer)
      fr.onerror = () => reject(fr.error)
      fr.readAsArrayBuffer(this)
    })
  }
}

// Mock Supabase client factory — returns a typed mock
// Downstream tests call createMockSupabase() and stub the methods they need
export function createMockSupabase() {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'test-user-id' } }, error: null }),
    },
  }
}

// Shared test data constants — UUIDs required for Zod uuid() validation
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_FAMILY_ID = '00000000-0000-0000-0000-000000000002'
export const TEST_HOLDER_ID = '00000000-0000-0000-0000-000000000003'
export const TEST_PAN = 'ABCDE1234F'
