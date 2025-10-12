# API Client Refactor - Todo List

**Purpose:** Refactor all API client functions in `splitdine-web/lib/api-client.ts` to follow the API-RULES.md guidelines.

**Goal:** Stop throwing errors on API-level failures. Return structured response objects instead.

**Reference:** See `/API-RULES.md` - Frontend API Client Design section

---

## Progress Overview

- **Total Functions:** 17
- **Already Compliant:** 8 ✅
- **Need Refactoring:** 9 ❌
- **Completed:** 1 / 9

---

## ✅ Already Compliant (No Changes Needed)

These functions already follow the rules - they return response objects and don't throw on API errors:

1. ✅ `joinEvent` (line 206) - Returns `{success, event?, error?, return_code?}`
2. ✅ `register` (line 454) - Returns `AuthResponse` directly
3. ✅ `login` (line 481) - Returns `AuthResponse` directly
4. ✅ `updateProfile` (line 539) - Returns `AuthResponse` directly
5. ✅ `changePassword` (line 563) - Returns `ApiResponse` directly
6. ✅ `deleteAccount` (line 577) - Returns `ApiResponse` directly
7. ✅ `forgotPassword` (line 595) - Returns `ApiResponse` directly
8. ✅ `resetPassword` (line 609) - Returns `ApiResponse` directly

---

## ❌ Need Refactoring

### Event Functions

#### 9. `createEvent` (line 178)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, event?: Event, error?: string}>`
- **Impact:** Used when creating new events
- **Priority:** Medium

#### 10. `getMyEvents` (line 240)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, events?: Event[], error?: string}>`
- **Impact:** Used on home page to load event list
- **Priority:** Medium

#### 11. `updateBankDetails` (line 262)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, bankDetails?: object, error?: string}>`
- **Impact:** Used when updating bank details
- **Priority:** Low

---

### Guest Functions

#### 12. `getGuests` (line 293) ⚠️
- **Status:** ✅ COMPLETED
- **Completed Date:** 2025-10-12
- **Changes Made:**
  - Updated return type to `Promise<{success: boolean, guests?: Guest[], error?: string}>`
  - Returns structured object instead of throwing on API errors
  - Wrapped in try/catch to handle network errors
  - Updated `loadGuestsForEvent()` in page.tsx to check success and show toast on error
- **Impact:** Used when opening events - **mobile console error bug FIXED**
- **Priority:** 🔴 HIGH (Active bug) - ✅ RESOLVED
- **Notes:** No more red console errors. Users now see friendly toast notification on errors.

#### 13. `addGuest` (line 316)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, guest?: Guest, error?: string}>`
- **Impact:** Used when adding guests to an event
- **Priority:** Medium

#### 14. `updateGuest` (line 345)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, guest?: Guest, error?: string}>`
- **Impact:** Used when editing guest details (amount, deposit, name, paid status)
- **Priority:** Medium

#### 15. `deleteGuest` (line 375)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, error?: string}>`
- **Impact:** Used when removing guests from an event
- **Priority:** Medium

#### 16. `addGuestItem` (line 394)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, item?: GuestItem, error?: string}>`
- **Impact:** Used when adding items to a guest's order
- **Priority:** Low

#### 17. `deleteGuestItem` (line 415)
- **Status:** ❌ Not Started
- **Current Behavior:** Throws error on non-SUCCESS
- **Target Return Type:** `Promise<{success: boolean, error?: string}>`
- **Impact:** Used when removing items from a guest's order
- **Priority:** Low

---

## Implementation Pattern

Each function should follow this pattern:

### Before (Current - Throws Error):
```typescript
export const getGuests = async (eventId: number): Promise<Guest[]> => {
  const sessionId = await ensureSession();

  const response = await apiCall<ApiResponse & { guests: Guest[] }>('/api/guests/get_guests', {
    session_id: sessionId,
    event_id: eventId,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to retrieve guests'); // ❌ Don't throw!
  }

  return response.guests || [];
};
```

### After (Target - Returns Object):
```typescript
export const getGuests = async (eventId: number): Promise<{success: boolean, guests?: Guest[], error?: string}> => {
  try {
    const sessionId = await ensureSession();

    const response = await apiCall<ApiResponse & { guests: Guest[] }>('/api/guests/get_guests', {
      session_id: sessionId,
      event_id: eventId,
    });

    if (response.return_code !== 'SUCCESS') {
      return {
        success: false,
        error: response.message || 'Failed to retrieve guests'
      };
    }

    return {
      success: true,
      guests: response.guests || []
    };
  } catch (error) {
    // Only network errors reach here
    return {
      success: false,
      error: 'Network error - please check your connection'
    };
  }
};
```

### Frontend Usage Pattern:
```typescript
// Before (assumes success):
const guests = await apiGetGuests(eventId); // Can throw!
setGuests(guests);

// After (checks success):
const result = await apiGetGuests(eventId);
if (result.success) {
  setGuests(result.guests);
} else {
  showToast(result.error); // Graceful error handling
}
```

---

## Suggested Order of Implementation

### Phase 1: Fix Critical Bug
1. `getGuests` - 🔴 HIGH priority (currently causing mobile console errors)

### Phase 2: Guest Functions (Logical Group)
2. `addGuest`
3. `updateGuest`
4. `deleteGuest`
5. `addGuestItem`
6. `deleteGuestItem`

### Phase 3: Event Functions (Logical Group)
7. `createEvent`
8. `getMyEvents`
9. `updateBankDetails`

---

## Frontend Updates Required

After refactoring each API client function, the following frontend files need to be updated to handle the new response structure:

- **`splitdine-web/app/page.tsx`** - Main application logic
  - Update `loadGuestsForEvent()` to handle `getGuests` response
  - Update `openEvent()` to catch and display errors
  - Update all guest manipulation functions
  - Update event creation and loading

- **`splitdine-web/app/profile/page.tsx`** (if applicable)
  - Check for any direct API calls

---

## Testing Checklist

For each refactored function:
- [ ] Function returns structured response object
- [ ] Function does NOT throw on API errors (return_code !== SUCCESS)
- [ ] Function DOES throw only on network errors (fetch failures)
- [ ] Frontend caller checks `success` field
- [ ] Frontend displays user-friendly error messages (toast/inline)
- [ ] Test on both laptop and mobile
- [ ] Test with and without authentication
- [ ] No red console errors

---

## Notes

- This refactor is part of aligning the codebase with `/API-RULES.md`
- The goal is to eliminate red console errors and provide graceful error handling
- Each function can be refactored independently
- Update this file as functions are completed
- Mark items with ✅ when done, update status and add completion date

---

**Last Updated:** 2025-10-12
**Status:** In Progress (1/9 complete)
