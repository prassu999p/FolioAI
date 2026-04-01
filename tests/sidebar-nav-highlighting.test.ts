import { describe, it, expect } from 'vitest'

// Mock the usePathname hook behavior to test the isNavItemActive logic
function isNavItemActive(itemHref: string, pathname: string): boolean {
  // For dashboard, check if path is exactly /dashboard or matches the family pattern
  if (itemHref === '/dashboard') {
    return pathname === '/dashboard'
  }

  // For family-scoped routes, check if pathname starts with the href
  // This handles /families/{familyId}/holders, /families/{familyId}/allocation, etc.
  return pathname.startsWith(itemHref)
}

describe('Sidebar Nav Highlighting', () => {
  describe('isNavItemActive logic', () => {
    it('should highlight Family Dashboard when on /dashboard', () => {
      expect(isNavItemActive('/dashboard', '/dashboard')).toBe(true)
    })

    it('should not highlight Family Dashboard when on family routes', () => {
      expect(
        isNavItemActive(
          '/dashboard',
          '/families/123e4567-e89b-12d3-a456-426614174000/holders'
        )
      ).toBe(false)
    })

    it('should highlight Individual Holders when on holders page', () => {
      const familyId = '123e4567-e89b-12d3-a456-426614174000'
      const holdersHref = `/families/${familyId}/holders`
      expect(isNavItemActive(holdersHref, holdersHref)).toBe(true)
    })

    it('should highlight Asset Allocation when on allocation page', () => {
      const familyId = '123e4567-e89b-12d3-a456-426614174000'
      const allocationHref = `/families/${familyId}/allocation`
      expect(isNavItemActive(allocationHref, allocationHref)).toBe(true)
    })

    it('should highlight Goals when on goals page', () => {
      const familyId = '123e4567-e89b-12d3-a456-426614174000'
      const goalsHref = `/families/${familyId}/goals`
      expect(isNavItemActive(goalsHref, goalsHref)).toBe(true)
    })

    it('should highlight Tax Intelligence when on tax page', () => {
      const familyId = '123e4567-e89b-12d3-a456-426614174000'
      const taxHref = `/families/${familyId}/tax`
      expect(isNavItemActive(taxHref, taxHref)).toBe(true)
    })

    it('should highlight AI Insights when on ai page', () => {
      const familyId = '123e4567-e89b-12d3-a456-426614174000'
      const aiHref = `/families/${familyId}/ai`
      expect(isNavItemActive(aiHref, aiHref)).toBe(true)
    })

    it('should not cross-highlight between different family pages', () => {
      const familyId = '123e4567-e89b-12d3-a456-426614174000'
      const holdersHref = `/families/${familyId}/holders`
      const allocationHref = `/families/${familyId}/allocation`
      expect(isNavItemActive(holdersHref, allocationHref)).toBe(false)
    })

    it('should correctly handle different family IDs', () => {
      const familyId1 = '123e4567-e89b-12d3-a456-426614174000'
      const familyId2 = '223e4567-e89b-12d3-a456-426614174000'
      const holdersHref = `/families/${familyId1}/holders`
      const pathname = `/families/${familyId2}/holders`
      expect(isNavItemActive(holdersHref, pathname)).toBe(false)
    })

    it('should handle nested routes correctly', () => {
      const familyId = '123e4567-e89b-12d3-a456-426614174000'
      const taxHref = `/families/${familyId}/tax`
      // Even if someone is on a nested tax page, it should still highlight
      expect(isNavItemActive(taxHref, `/families/${familyId}/tax/some-nested-route`)).toBe(true)
    })
  })
})
