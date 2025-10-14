# Event Settings Page - Design Document

## Overview
This document outlines the design for an Event Settings page where hosts can configure and manage their events.

---

## Key Features

### **1. Basic Event Information**
- **Event Name** - Allow host to rename
- **Event Date/Time** - When is the dinner happening?
- **Location/Restaurant** - Where is it?
- **Notes** - Free text for instructions ("Bring cash for drinks", "Smart casual dress code")

### **2. Bank Details** (already exists!)
- Account number
- Sort code
- Account name
- ✓ We already have this API: `updateBankDetails`

### **3. Guest Code Management**
- **Display current code** prominently
- **Regenerate code** button - useful if code leaked or shared too widely
- Warning: "This will invalidate the old code"

### **4. Event Status**
- **Active** - Normal state, guests can join
- **Closed to new guests** - Existing guests can still view, no new joins
- **Archived** - Move to separate "Past Events" section

### **5. Guest Permissions** (privacy controls)
- Toggle: Can guests see each other's bills?
- Toggle: Can guests add their own pre-orders?
- Toggle: Make event read-only (no edits, just viewing)

### **6. Advanced Settings**
- Currency symbol (£, $, €)
- Default service charge % (optional)

---

## Implementation Requirements

### **Database Changes** (`events` table)

```sql
ALTER TABLE events
  ADD COLUMN event_date TIMESTAMP,
  ADD COLUMN location VARCHAR(255),
  ADD COLUMN notes TEXT,
  ADD COLUMN status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN guest_can_see_others BOOLEAN DEFAULT true,
  ADD COLUMN guest_can_edit BOOLEAN DEFAULT true,
  ADD COLUMN currency_symbol VARCHAR(5) DEFAULT '£';
```

**Notes:**
- `status` enum: 'active', 'closed', 'archived'
- All new columns should be nullable or have defaults for backward compatibility

### **Backend API** (new endpoints)

**Update General Settings:**
```javascript
POST /api/events/update_settings
Request: {
  event_id: number,
  event_name?: string,
  event_date?: string (ISO timestamp),
  location?: string,
  notes?: string,
  status?: 'active' | 'closed' | 'archived',
  guest_can_see_others?: boolean,
  guest_can_edit?: boolean,
  currency_symbol?: string
}
Response: {
  return_code: "SUCCESS",
  event: { ...updated fields }
}
```

**Regenerate Guest Code:**
```javascript
POST /api/events/regenerate_guest_code
Request: {
  event_id: number
}
Response: {
  return_code: "SUCCESS",
  guest_code: "ABC123"
}
```

**Update Event Status:**
```javascript
POST /api/events/update_status
Request: {
  event_id: number,
  status: 'active' | 'closed' | 'archived'
}
Response: {
  return_code: "SUCCESS",
  message: "Event status updated"
}
```

### **Frontend Implementation**

**UI Components:**
1. **Settings Button** - Gear icon in event header (host only)
2. **Settings Modal** - Full-screen or large modal with tabs:
   - **General Tab:**
     - Event name input
     - Date picker
     - Location input
     - Notes textarea
   - **Bank Details Tab:** (existing functionality)
     - Account number
     - Sort code
     - Account name
   - **Guest Code Tab:**
     - Display current code (large, copyable)
     - Regenerate button with confirmation
   - **Permissions Tab:**
     - Toggle switches for guest permissions
   - **Advanced Tab:**
     - Event status dropdown
     - Currency selector
     - Delete event button

**Permissions Check:**
- Only host can access settings
- Guests see "Settings" button greyed out or hidden
- Backend validates host role on all setting endpoints

**State Management:**
- Add event settings to local state
- Update via API calls
- Optimistic updates for better UX

---

## Priority Levels

### **MVP (Phase 1) - Do First:**
1. Event name editing
2. Guest code display + regenerate
3. Event date/location fields
4. Notes field

**Why MVP?** These are the most commonly needed features and provide immediate value.

### **Phase 2 - Enhanced Features:**
5. Status management (close to new guests, archive)
6. Guest permission toggles (privacy controls)
7. Separate "Past Events" section for archived events

**Why Phase 2?** These add polish and control but aren't essential for basic functionality.

### **Future Considerations:**
8. Currency settings
9. Service charge defaults
10. Export event summary to PDF/CSV
11. Event templates (save settings for reuse)

---

## User Flow

### Host Opens Settings:
1. Click gear icon in event header
2. Settings modal opens with General tab active
3. Make changes to any fields
4. Click "Save Changes" button
5. Modal closes, changes reflected immediately

### Regenerating Guest Code:
1. Navigate to Guest Code tab
2. Click "Regenerate Code" button
3. Confirmation modal: "This will invalidate the old code. Are you sure?"
4. Confirm → New code generated
5. Old code no longer works for joining
6. Host can share new code

### Archiving Event:
1. Navigate to Advanced tab
2. Select "Archived" from status dropdown
3. Confirmation: "Move to Past Events?"
4. Event removed from active list
5. Accessible from "Past Events" section

---

## Technical Considerations

### Security:
- All endpoints require `verifyToken` middleware
- Backend validates user is host before allowing changes
- Guest code regeneration should be logged for audit trail

### Database Migrations:
- Need migration script to add new columns
- Set sensible defaults for existing events
- Test backward compatibility

### Frontend Validation:
- Event name: min 1 char, max 255 chars
- Location: max 255 chars
- Notes: max 5000 chars
- Date: must be in the future (optional warning, not hard block)

### Error Handling:
- Network errors: show toast notification
- Validation errors: inline error messages
- Conflicts: handle gracefully (e.g., code already exists)

---

## Questions to Consider

1. Should guests be notified when settings change? (e.g., event renamed, code changed)
2. Should there be an event history/audit log?
3. How to handle timezone for event date?
4. Should archived events be auto-archived after a certain time?
5. Can guests request to join a closed event? (waitlist?)

---

## Related Files

- **Backend:** `splitdine-server/routes/events.js`
- **Frontend API Client:** `splitdine-web/lib/api-client.ts`
- **Frontend UI:** `splitdine-web/app/page.tsx`
- **Database Schema:** `docs/DB-Schema.sql`

---

## Status

**Current Status:** Design phase - not yet implemented

**Last Updated:** 2025-10-12

**Next Steps:**
1. Get user approval on MVP feature set
2. Create database migration script
3. Implement backend API endpoints
4. Create frontend settings UI
5. Test thoroughly with multiple scenarios
