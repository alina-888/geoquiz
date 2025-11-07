# Geolocation Unlock Logic - Implementation Plan

## Current State Analysis

**What I found:**
- Questions have a `geolocation` JSON field (models.py:54) with structure: `{ lat, lng, radius, address }`
- `LocationPicker.jsx` is already implemented for setting question locations during quiz creation
- Radius ranges from 20m to 500m (LocationPicker.jsx:337-339)
- `Question.jsx` currently shows all questions without any location checks
- No DEBUG mode configuration exists yet

---

## Proposed Implementation Plan

### 1. Create a Geolocation Utility Module
**File:** `frontend/src/utils/geolocation.js`

**Purpose:** Centralized location logic
- **Calculate distance** between two coordinates (Haversine formula)
- **Get user's current position** with error handling
- **Check if user is within radius** of a target location
- **Handle permissions** (denied, unavailable, timeout)

**Key functions:**
```javascript
- calculateDistance(lat1, lng1, lat2, lng2) → distance in meters
- getCurrentPosition() → Promise<{lat, lng, accuracy}>
- isWithinRadius(userLocation, targetLocation, radius) → boolean
```

---

### 2. Create DEBUG Mode Configuration

**Approach:** Use localStorage for easy toggling during development

**Implementation:**
- Check `localStorage.getItem('DEBUG_SKIP_GEOLOCATION')`
- If `true`, bypass all location checks
- Add a simple toggle in the UI (maybe in Profile or a dev panel)
- Could also use `REACT_APP_DEBUG_MODE` environment variable

**Benefits:**
- Easy to enable/disable during development
- No code changes needed between dev/prod
- Can test both locked and unlocked states

---

### 3. Modify Question.jsx - Add Location Lock Logic

**Key Changes:**

**a) Add location state:**
```javascript
- userLocation: {lat, lng, accuracy} | null
- locationError: string | null
- isCheckingLocation: boolean
- isLocked: boolean
- distanceToTarget: number | null
```

**b) On component mount:**
- Check if question has geolocation
- If yes, check DEBUG mode
- If not in DEBUG mode, request user's location
- Calculate distance and determine if locked

**c) Update UI rendering:**
- **IF locked:** Show locked state with:
  - Lock icon
  - Distance to target location
  - Direction/map showing where to go
  - "You need to be within Xm of [address]" message
  - Small map preview (using Leaflet)

- **IF unlocked:** Show question normally (current behavior)

**d) Handle edge cases:**
- Location permission denied → show error, maybe allow admin override
- Location unavailable → show helpful message
- High inaccuracy → warn user ("Your location accuracy is low")
- Quiz creator viewing their own quiz → bypass lock (or respect DEBUG mode)

---

### 4. Add Location Status Component
**File:** `frontend/src/components/LocationStatus.jsx`

**Purpose:** Reusable UI for showing location lock state

**Displays:**
- Current lock status (locked/unlocked)
- Distance to target (e.g., "You are 247m away")
- Small interactive map showing:
  - Target location (marker)
  - Radius circle
  - User's current location (different colored marker)
- Real-time updates as user moves
- "Refresh location" button

---

### 5. Modify QuizProgress.jsx - Add Lock Indicators

**Changes:**
- Show lock icon next to locked questions in progress view
- Display which questions are location-locked
- Show total locked vs unlocked questions
- Maybe add a "Check all locations" button to batch-check

---

### 6. Add Location Tracking Strategy

**Options to consider:**

**Option A: Check on question load (simpler)**
- Check location only when user navigates to question
- User must manually refresh if they move
- Pros: Simple, lower battery usage
- Cons: Not real-time

**Option B: Continuous tracking (more UX-friendly)**
- Use `watchPosition()` to track movement
- Auto-unlock when user enters radius
- Show real-time distance updates
- Pros: Better UX, automatic unlock
- Cons: Higher battery usage, more complex

**Recommendation:** Start with Option A, add Option B as enhancement

---

### 7. Handle Navigation/Routing

**Prevent direct access to locked questions:**
- User might try to navigate directly to `/quizzes/1/question/5/`
- Need to check location before rendering question
- If locked, redirect to QuizProgress or show locked state
- Store lock states in component/context to avoid repeated checks

---

### 8. Backend Considerations (Optional Enhancement)

**Currently:** No backend validation of location
**Future enhancement:**
- Backend could validate user's location on answer submission
- Prevent cheating via browser DevTools
- Store location proof with answer
- Add `location_verified` field to UserAnswer model

**For MVP:** Frontend-only validation is acceptable since this is educational

---

## Detailed Technical Specifications

### Distance Calculation (Haversine Formula)
```javascript
// Returns distance in meters
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
```

### DEBUG Mode Implementation
```javascript
// In geolocation.js utility
export const isDebugMode = () => {
  return localStorage.getItem('DEBUG_SKIP_GEOLOCATION') === 'true' ||
         process.env.REACT_APP_DEBUG_GEOLOCATION === 'true';
};

// Toggle helper (can expose in UI)
export const toggleDebugMode = () => {
  const current = isDebugMode();
  localStorage.setItem('DEBUG_SKIP_GEOLOCATION', String(!current));
  window.location.reload(); // Reload to apply
};
```

---

## Implementation Order (Recommended)

1. **Create geolocation utility** with distance calculation & DEBUG mode
2. **Add LocationStatus component** for locked state UI
3. **Modify Question.jsx** to check location and show locked state
4. **Update QuizProgress.jsx** to show lock indicators
5. **Add real-time tracking** (optional enhancement)
6. **Add backend validation** (future security enhancement)

---

## Testing Strategy

**During Development (with DEBUG mode):**
- Test locked state UI without traveling
- Test distance calculations with mock coordinates
- Test permission handling

**Real-world Testing:**
- Test with various radius values (20m, 100m, 500m)
- Test accuracy thresholds
- Test in areas with poor GPS signal
- Test permission denial flow

---

## Key Files to Create/Modify

**New Files:**
- `frontend/src/utils/geolocation.js` - utility functions
- `frontend/src/components/LocationStatus.jsx` - locked state UI
- `frontend/src/hooks/useGeolocation.js` - optional custom hook

**Modified Files:**
- `frontend/src/pages/Question.jsx` - add location checking logic (lines 1-164)
- `frontend/src/pages/QuizProgress.jsx` - show lock indicators (lines 42-64)

---

## UI/UX Considerations

**Locked State Should Show:**
- Clear lock icon
- Friendly message: "This question unlocks when you're near [location name]"
- Current distance: "You are 247m away"
- Map showing target location
- Refresh button to re-check location

**Unlocked State:**
- Maybe show a success message briefly
- Continue with normal question flow

**Error States:**
- Permission denied: "Location access required. Please enable in browser settings."
- Unavailable: "Location unavailable. Make sure GPS is enabled."
- Timeout: "Location request timed out. Try again?"

---

## Summary

This plan balances functionality, user experience, and development complexity. The DEBUG mode ensures you can develop and test without physically traveling to locations, while the real implementation provides engaging location-based gameplay for users.

The approach prioritizes:
1. **Developer experience** - DEBUG mode for easy testing
2. **User experience** - Clear feedback about lock state and location
3. **Maintainability** - Centralized utilities and reusable components
4. **Future extensibility** - Clear path for backend validation and real-time tracking
