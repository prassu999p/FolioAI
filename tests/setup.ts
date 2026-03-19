import { vi } from 'vitest'

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

// Shared test data constants
export const TEST_USER_ID = 'test-user-id'
export const TEST_FAMILY_ID = 'test-family-id'
export const TEST_HOLDER_ID = 'test-holder-id'
export const TEST_PAN = 'ABCDE1234F'
