# React Best Practices Improvements

Checklist for improving this codebase against React best practices.

---

## Critical Issues

### Component Structure
- [x] Extract `CampList` to `components/CampList.tsx`
- [x] Extract `CampMap` to `components/CampMap.tsx`
- [x] Extract `CampCalendar` to `components/CampCalendar.tsx`
- [x] Extract `MultiWeekPlanner` to `components/MultiWeekPlanner.tsx`
- [ ] Extract `CampModal` to `components/CampModal.tsx`
- [ ] Extract `ModalMap` to `components/ModalMap.tsx`
- [x] Move utility functions to `lib/utils.tsx`
- [x] Move types to `lib/types.ts`

### Accessibility
- [ ] Add `aria-label` to icon-only buttons
- [ ] Convert clickable divs to `<button>` elements
- [ ] Add `role` attributes to custom interactive elements
- [ ] Add keyboard navigation (`onKeyDown`) to interactive elements
- [ ] Add focus management for modals
- [ ] Add focus trap in modal component
- [ ] Add skip-to-content link

### Error Handling
- [x] Create `components/ErrorBoundary.tsx`
- [x] Wrap main app content in ErrorBoundary
- [ ] Add ErrorBoundary around map components (external library risk)
- [ ] Replace empty `catch {}` blocks with proper error logging
- [ ] Add user-facing error states for failed data fetches
- [ ] Add error state for geolocation failures

---

## High Priority

### Performance
- [ ] Add `useCallback` to `setPlannerCamp` handler
- [ ] Add `useCallback` to `toggleFavorite` handler
- [ ] Add `useCallback` to `getNearMe` handler
- [ ] Add `useCallback` to `clearUserLocation` handler
- [ ] Wrap `CampList` in `React.memo()`
- [ ] Wrap `CampMap` in `React.memo()`
- [ ] Wrap `CampCalendar` in `React.memo()`
- [ ] Wrap `MultiWeekPlanner` in `React.memo()`
- [ ] Add `useMemo` for category styles computation
- [ ] Add `useMemo` for grouped data structures

### State Management
- [ ] Consider `useReducer` for related filter/view state
- [ ] Consolidate localStorage persistence into single pattern

---

## Medium Priority

### Code Splitting
- [ ] Add `React.lazy()` for `CampMap` component
- [ ] Add `React.lazy()` for `CampCalendar` component
- [ ] Add `React.lazy()` for `MultiWeekPlanner` component
- [ ] Add `Suspense` boundaries with loading fallbacks

### Custom Hooks
- [ ] Create `useGeolocation()` hook
- [ ] Create `usePersistentState()` hook for localStorage sync
- [ ] Create `useLeaflet()` hook (consolidate duplicated loading)
- [ ] Create `useCampFiltering()` hook

### TypeScript
- [ ] Install `@types/leaflet`
- [ ] Replace `(window as any).L` with proper Leaflet types
- [ ] Type map refs properly instead of `useRef<any>`
- [ ] Type event handlers (e.g., Leaflet click events)

### Map Optimization
- [ ] Implement marker diffing (only update changed markers)
- [ ] Clean up `URL.createObjectURL()` in PDF generation

---

## Low Priority

### Code Quality
- [ ] Extract inline SVG strings to components or files
- [ ] Use static Tailwind classes instead of dynamic `stagger-${n}`
- [ ] Add proper cleanup for global event listeners
- [ ] Add request timeout/retry logic for API calls

### Future Considerations
- [ ] Add Suspense boundaries for data loading
- [ ] Consider server components where applicable
- [ ] Add testing infrastructure
- [ ] Add Storybook for component development

---

## Progress

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Component Structure | 8 | 6 | 2 |
| Accessibility | 7 | 0 | 7 |
| Error Handling | 6 | 2 | 4 |
| Performance | 10 | 0 | 10 |
| State Management | 2 | 0 | 2 |
| Code Splitting | 4 | 0 | 4 |
| Custom Hooks | 4 | 0 | 4 |
| TypeScript | 4 | 0 | 4 |
| Map Optimization | 2 | 0 | 2 |
| Code Quality | 4 | 0 | 4 |
| **Total** | **51** | **8** | **43** |


## Recommended Next Steps

  1. ~~Create components/ folder - Move CampList, CampMap, CampCalendar, MultiWeekPlanner~~ DONE
  2. ~~Add ErrorBoundary - Wrap root content~~ DONE
  3. Accessibility pass - Focus on buttons and interactive elements first
  4. Performance hooks - Add useCallback to prevent child re-renders