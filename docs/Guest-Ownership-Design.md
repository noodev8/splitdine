# Guest Entry Ownership System - Design Document

## Problem Statement

**Current Issue:**
When a host creates a guest entry for "Andreas" and the real Andreas joins with his account, he might:
- Not realize the "Andreas" entry is meant for him
- Create a duplicate entry as "Andy" for his pre-orders
- Result: Two entries for the same person, confusion about which is correct

**Root Cause:**
No link between guest entries (text strings in `guests` table) and user accounts (in `app_user` table).

---

## Solution: Guest Entry Claiming System

Allow registered users to "claim" their guest entry, establishing ownership while preserving the host's ability to manage bills.

---

## Core Concepts

### **1. Ownership States**

**Unclaimed Entry:**
- No user linked to this guest
- Host has full control (edit name, amount, deposit, notes, items, paid status)
- Typical for guests without the app

**Claimed Entry:**
- Linked to a specific user account via `app_user_id`
- Split permissions:
  - **Guest can:** Add/remove their own pre-order items
  - **Host can:** Edit amount, deposit, notes, mark as paid
- Only the claiming user can add items to this entry

### **2. Key Principles**

1. **Host creates all entries upfront** - They know the guest list
2. **Claiming is optional** - Works for mixed crowds (app + no app)
3. **One claim per person** - User can only claim one entry per event
4. **Reversible** - Users can unclaim if they made a mistake
5. **Host override** - Host can force-unclaim if needed

---

## Database Changes

### Add Ownership Column to `guests` Table

```sql
ALTER TABLE guests
  ADD COLUMN app_user_id INTEGER REFERENCES app_user(id) ON DELETE SET NULL;

CREATE INDEX idx_guests_app_user_id ON guests(app_user_id);

COMMENT ON COLUMN guests.app_user_id IS 'User who claimed this guest entry. NULL = unclaimed, managed fully by host.';
```

**Notes:**
- `app_user_id` is nullable - NULL means unclaimed
- `ON DELETE SET NULL` - If user account deleted, entry becomes unclaimed (not deleted)
- Index for performance when checking "what entries can this user claim?"

---

## Backend API Endpoints

### **1. Claim Guest Entry**

```javascript
POST /api/guests/claim_guest

Request: {
  guest_id: number     // ID of guest entry to claim
}

Response: {
  return_code: "SUCCESS",
  guest: {
    id: number,
    name: string,
    app_user_id: number,  // Now set to current user
    ...other fields
  },
  message: "Guest entry claimed successfully"
}

Return Codes:
- "SUCCESS" - Claimed successfully
- "MISSING_FIELDS" - guest_id required
- "GUEST_NOT_FOUND" - Invalid guest_id or not in your event
- "ALREADY_CLAIMED" - This entry is already claimed by someone else
- "USER_HAS_CLAIMED" - You've already claimed a different entry in this event
- "UNAUTHORIZED" - Not authenticated or not a member of event
- "SERVER_ERROR" - Database error
```

**Business Logic:**
1. Verify user is a member of the event (guest or host)
2. Check guest entry exists and belongs to this event
3. Check entry is not already claimed (`app_user_id IS NULL`)
4. Check user hasn't already claimed another entry in this event
5. Update `guests.app_user_id = current_user.id`
6. Return updated guest object

### **2. Unclaim Guest Entry**

```javascript
POST /api/guests/unclaim_guest

Request: {
  guest_id: number     // ID of guest entry to unclaim
}

Response: {
  return_code: "SUCCESS",
  guest: {
    id: number,
    name: string,
    app_user_id: null,  // Now unclaimed
    ...other fields
  },
  message: "Guest entry unclaimed successfully"
}

Return Codes:
- "SUCCESS" - Unclaimed successfully
- "MISSING_FIELDS" - guest_id required
- "GUEST_NOT_FOUND" - Invalid guest_id
- "NOT_CLAIMED_BY_YOU" - Can't unclaim entry you didn't claim (unless host)
- "UNAUTHORIZED" - Not authenticated
- "SERVER_ERROR" - Database error
```

**Business Logic:**
1. Verify user is authenticated
2. Check guest entry exists
3. Check one of:
   - Entry is claimed by current user, OR
   - Current user is host of the event (can force-unclaim)
4. Set `guests.app_user_id = NULL`
5. Return updated guest object

### **3. Get Claimable Guests**

```javascript
POST /api/guests/get_claimable

Request: {
  event_id: number
}

Response: {
  return_code: "SUCCESS",
  guests: [
    {
      id: number,
      name: string,
      amount: number,
      app_user_id: null,  // Only unclaimed entries returned
      ...
    }
  ],
  user_claimed_guest_id: number | null  // ID of entry user has already claimed, if any
}

Return Codes:
- "SUCCESS" - List returned (may be empty)
- "MISSING_FIELDS" - event_id required
- "NOT_A_MEMBER" - User is not a member of this event
- "UNAUTHORIZED" - Not authenticated
- "SERVER_ERROR" - Database error
```

**Business Logic:**
1. Verify user is a member of the event
2. Get all guests WHERE `event_id = X` AND `app_user_id IS NULL`
3. Also check if user has already claimed an entry in this event
4. Return both lists

---

## Frontend Implementation

### **UI Components**

#### **1. Claiming Interface (Guest View)**

When a registered guest opens an event, they see:

```
┌─────────────────────────────────────────┐
│  🎉 Dinner at Pizza Express             │
│  You're viewing as: Andreas             │
│  andreas@email.com                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Find Your Entry                        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Andreas              £45.50     │   │
│  │ Main course, drinks             │   │
│  │              [Claim This Entry] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Sarah                £32.00     │   │
│  │ Vegetarian option              │   │
│  │              [Claim This Entry] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Mike          ✓ CLAIMED         │   │
│  │ (by another user)              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**After Claiming:**

```
┌─────────────────────────────────────────┐
│  ✓ This is your entry                   │
│  You can now add your pre-orders        │
└─────────────────────────────────────────┘

Guest List:

┌─────────────────────────────────────────┐
│  ✅ Andreas (YOU)           £45.50     │
│  Main course, drinks                   │
│  + Add Pre-Order          [Unclaim]    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Sarah                       £32.00     │
│  Vegetarian option                     │
└─────────────────────────────────────────┘
```

#### **2. Visual Indicators**

**Badge System:**
- `✅ [Name] (YOU)` - Your claimed entry (green)
- `✓ [Name]` - Claimed by someone else (gray)
- `[Name]` - Unclaimed (default)

**Entry Actions:**
- **Unclaimed entries:** No action buttons for guests
- **Your entry:** Show "Unclaim" button, "+ Add Pre-Order" enabled
- **Other claimed:** Show "Claimed" badge, no actions
- **Host view:** All entries editable, can see who claimed what

#### **3. Claim Confirmation Modal**

```
┌─────────────────────────────────────┐
│  Claim this entry?                 │
│                                    │
│  You're about to claim:            │
│                                    │
│  Name: Andreas                     │
│  Current bill: £45.50              │
│                                    │
│  After claiming, you'll be able to │
│  add your own pre-orders to this   │
│  entry. The host can still edit    │
│  your final bill amount.           │
│                                    │
│  [ Cancel ]         [ Claim Entry] │
└─────────────────────────────────────┘
```

### **State Management**

**New state variables:**
```typescript
const [claimableGuests, setClaimableGuests] = useState<Guest[]>([]);
const [userClaimedGuestId, setUserClaimedGuestId] = useState<number | null>(null);
const [showClaimModal, setShowClaimModal] = useState(false);
const [guestToClaim, setGuestToClaim] = useState<Guest | null>(null);
```

**Load claimable guests:**
```typescript
useEffect(() => {
  if (currentEventId && userRole === 'guest') {
    loadClaimableGuests();
  }
}, [currentEventId, userRole]);
```

---

## User Flows

### **Flow 1: Guest Claims Their Entry**

1. User joins event as guest
2. System loads all unclaimed guest entries
3. User sees list with "Claim This Entry" buttons
4. User clicks "Claim" next to "Andreas"
5. Confirmation modal appears
6. User confirms
7. API call: `POST /api/guests/claim_guest`
8. Success: Entry now shows "✅ Andreas (YOU)"
9. "+ Add Pre-Order" button is now enabled
10. Entry removed from other users' claimable lists

### **Flow 2: Guest Unclaims Wrong Entry**

1. User realizes they claimed wrong entry
2. Click "Unclaim" button on their entry
3. Confirmation: "Remove your claim on this entry?"
4. User confirms
5. API call: `POST /api/guests/unclaim_guest`
6. Entry reverts to unclaimed state
7. User can claim a different entry

### **Flow 3: Host Force-Unclaims Entry**

1. Host sees guest claimed wrong entry
2. Host clicks "⋮" menu → "Unclaim Entry"
3. Confirmation: "Remove [User]'s claim on this entry?"
4. Host confirms
5. API call: `POST /api/guests/unclaim_guest` (host override)
6. Entry becomes unclaimed
7. Host or another user can now claim it

### **Flow 4: Guest Without App**

1. Host creates entry for "Mike"
2. Mike doesn't have the app
3. Entry remains unclaimed
4. Host manages everything for Mike
5. No claiming interface shown to Mike (he's not registered)

---

## Permissions Matrix

| Action | Unclaimed Entry | Claimed Entry (Owner) | Claimed Entry (Other User) | Host Always Can |
|--------|----------------|----------------------|---------------------------|----------------|
| View entry | ✓ | ✓ | ✓ | ✓ |
| Edit name | Host only | ❌ | ❌ | ✓ |
| Edit amount | Host only | ❌ | ❌ | ✓ |
| Edit deposit | Host only | ❌ | ❌ | ✓ |
| Edit notes | Host only | ❌ | ❌ | ✓ |
| Mark paid | Host only | ❌ | ❌ | ✓ |
| Add items | Host only | ✓ | ❌ | ✓ |
| Delete items | Host only | ✓ (own items) | ❌ | ✓ |
| Claim entry | Any guest | ❌ (already claimed) | ❌ | N/A |
| Unclaim entry | N/A | ✓ | ❌ | ✓ (force) |
| Delete entry | Host only | ❌ | ❌ | ✓ |

---

## Edge Cases & Handling

### **1. Multiple People Claim Same Name**

**Scenario:** Two Andreas at the party

**Solution:**
- Show full list of unclaimed entries, not just name matches
- User manually picks which entry to claim
- First-come-first-served (race condition handled by DB transaction)

### **2. User Claims Wrong Entry**

**Solution:**
- "Unclaim" button always available on own entry
- No penalty for unclaiming and reclaiming
- Host can force-unclaim if user doesn't notice

### **3. Guest Leaves Event After Claiming**

**Database Behavior:**
```sql
-- When user leaves event (deletes membership):
DELETE FROM user_event_memberships WHERE app_user_id = X AND event_id = Y;

-- Guest entry remains:
SELECT * FROM guests WHERE app_user_id = X;
-- Still shows as claimed by that user

-- Options:
-- A) Leave claimed (preserves data, user might rejoin)
-- B) Auto-unclaim when leaving (cleaner, but loses link)
```

**Recommended:** Option A - Leave claimed, but show as "(Left Event)" in UI

### **4. Host Deletes Claimed Entry**

**Solution:**
- Normal delete flow, no special handling
- Cascade deletes items as usual
- User sees their claimed entry disappear from list

### **5. User Has Already Claimed Different Entry**

**Prevention:**
```javascript
// In claim_guest endpoint:
const existingClaim = await query(
  `SELECT id FROM guests
   WHERE event_id = $1 AND app_user_id = $2`,
  [event_id, user_id]
);

if (existingClaim.rows.length > 0) {
  return {
    return_code: 'USER_HAS_CLAIMED',
    message: 'You have already claimed a different entry in this event'
  };
}
```

**UI:** Gray out "Claim" buttons if user has already claimed one

---

## Migration Strategy

### **Phase 1: Database Migration**

```sql
-- Add column
ALTER TABLE guests
  ADD COLUMN app_user_id INTEGER REFERENCES app_user(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_guests_app_user_id ON guests(app_user_id);

-- All existing entries start as unclaimed (NULL is default)
```

### **Phase 2: Backend API**

1. Add three new endpoints to `routes/guests.js`
2. Update permissions in existing endpoints:
   - `add_item`: Check if claimed by current user OR user is host
   - `delete_item`: Check ownership

### **Phase 3: Frontend UI**

1. Add claiming interface for guests
2. Update guest list display to show claimed status
3. Add unclaim button for own entries
4. Update permissions for item management

### **Phase 4: Testing**

- Test claiming flow with multiple users
- Test race conditions (two users claim same entry)
- Test unclaim flow
- Test host force-unclaim
- Test permissions after claiming

---

## UI/UX Considerations

### **Onboarding Flow**

When guest joins event for first time, show tooltip:

```
┌─────────────────────────────────────┐
│  💡 Tip: Claim Your Entry           │
│                                    │
│  Find your name in the list and    │
│  click "Claim This Entry" to add   │
│  your own pre-orders.              │
│                                    │
│  [Got it]                          │
└─────────────────────────────────────┘
```

### **Empty States**

**No unclaimed entries:**
```
┌─────────────────────────────────────┐
│  All entries have been claimed      │
│                                    │
│  If you can't find your entry,     │
│  ask the host to add you.          │
└─────────────────────────────────────┘
```

**Already claimed one:**
```
┌─────────────────────────────────────┐
│  ✓ You've claimed: Andreas          │
│                                    │
│  You can only claim one entry per  │
│  event. To claim a different one,  │
│  unclaim this entry first.         │
└─────────────────────────────────────┘
```

### **Mobile Responsiveness**

- Claim buttons should be large enough for touch
- Confirmation modals should be thumb-friendly
- Use swipe gestures for quick actions (optional)

---

## Analytics & Logging

**Track these metrics:**
- Number of entries claimed vs unclaimed per event
- Time to claim (how long after joining?)
- Unclaim rate (mistakes?)
- Force-unclaim rate (host intervention needed)

**Audit log entries:**
```
User #5 (andreas@email.com) claimed guest #12 (Andreas) in event #3
User #5 unclaimed guest #12 in event #3
Host #2 force-unclaimed guest #12 (was owned by User #5) in event #3
```

---

## Security Considerations

### **Authorization**

- All endpoints require authentication (`verifyToken`)
- Verify user is member of event before allowing claim
- Verify ownership before allowing unclaim (unless host)
- Rate limiting on claim/unclaim to prevent abuse

### **Race Conditions**

Use database transaction for claiming:

```javascript
await withTransaction(async (client) => {
  // Lock the row
  const guest = await client.query(
    `SELECT * FROM guests WHERE id = $1 FOR UPDATE`,
    [guest_id]
  );

  // Check still unclaimed
  if (guest.rows[0].app_user_id !== null) {
    throw new Error('Already claimed');
  }

  // Claim it
  await client.query(
    `UPDATE guests SET app_user_id = $1 WHERE id = $2`,
    [user_id, guest_id]
  );
});
```

---

## Future Enhancements

1. **Smart matching:** Auto-suggest entries based on user's name
2. **QR codes:** Each entry gets QR code for easy claiming
3. **Email invites:** Host sends email with claim link embedded
4. **Transfer ownership:** Allow transfer between users
5. **History:** Show claim/unclaim history on entry

---

## Related Files

- **Backend:** `splitdine-server/routes/guests.js`
- **Frontend API Client:** `splitdine-web/lib/api-client.ts`
- **Frontend UI:** `splitdine-web/app/page.tsx`
- **Database Schema:** `docs/DB-Schema.sql`

---

## Status

**Current Status:** Design phase - not yet implemented

**Last Updated:** 2025-10-12

**Next Steps:**
1. Review and approve design
2. Write database migration script
3. Implement backend API endpoints
4. Build frontend claiming UI
5. Test with multiple users
6. Deploy and monitor usage

---

## Questions for Review

1. Should we allow unclaimed entries to be viewed by guests, or hide them?
2. What happens if host renames entry after it's claimed?
3. Should there be a time limit on claiming (e.g., 24 hours after joining)?
4. Should hosts be able to "assign" entries to users instead of self-claiming?
5. How to handle if user account is deleted but they had claimed entries?
