/*
=======================================================================================================================================
API Client Helper
=======================================================================================================================================
Purpose: Centralized API client for communicating with SplitDine Express server.
         Manages session creation, event operations, and error handling.
         Implements hybrid approach: API first with localStorage fallback.
=======================================================================================================================================
*/

// =============================================================================
// Configuration
// =============================================================================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

// =============================================================================
// Types
// =============================================================================
export interface ApiResponse {
  return_code: string;
  message?: string;
  [key: string]: unknown;
}

export interface Event {
  id: number;
  name: string;
  host_code?: string;
  guest_code: string;
  role: 'host' | 'guest';
  created_at: string;
  joined_at?: string;
  payment_method?: 'venue' | 'bank_transfer';
  bank_account_number?: string;
  bank_sort_code?: string;
  bank_account_name?: string;
  allow_guest_editing?: boolean;
}

export interface GuestItem {
  id: number;
  note: string;
  price?: number | null;
}

export interface Guest {
  id: number;
  event_id: number;
  name: string;
  amount: number;
  deposit: number;
  notes: string;
  paid: boolean;
  app_user_id: number | null;
  items: GuestItem[];
}

// =============================================================================
// Core API Call Function
// =============================================================================
/**
 * Makes an API call to the Express server
 * @param {string} endpoint - API endpoint (e.g., '/api/events/create')
 * @param {object} body - Request payload
 * @returns {Promise<T>} - API response
 */
export const apiCall = async <T = ApiResponse>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Build headers with auth token if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authToken = getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`API call failed [${endpoint}]:`, error);
    throw error;
  }
};

// =============================================================================
// Event API Functions
// =============================================================================
/**
 * Creates a new event
 * Requires authentication.
 * @param {string} eventName - Name of the event
 * @param {string} bankAccountNumber - Bank account number (optional)
 * @param {string} bankSortCode - Bank sort code (optional)
 * @param {string} bankAccountName - Bank account name (optional)
 * @returns {Promise<Event>} - Created event details
 */
export const createEvent = async (
  eventName: string,
  bankAccountNumber?: string,
  bankSortCode?: string,
  bankAccountName?: string
): Promise<Event> => {
  const response = await apiCall<ApiResponse & { event: Event }>('/api/events/create', {
    event_name: eventName,
    bank_account_number: bankAccountNumber,
    bank_sort_code: bankSortCode,
    bank_account_name: bankAccountName,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to create event');
  }

  return response.event;
};

/**
 * Joins an existing event using a guest code
 * Requires authentication.
 * @param {string} code - Guest code
 * @returns {Promise<{success: boolean, event?: Event, error?: string}>} - Result with event or error
 */
export const joinEvent = async (code: string): Promise<{success: boolean, event?: Event, error?: string, return_code?: string}> => {
  try {
    const response = await apiCall<ApiResponse & { event: Event }>('/api/events/join', {
      code: code.trim().toUpperCase(),
    });

    if (response.return_code !== 'SUCCESS') {
      return {
        success: false,
        error: response.message || 'Failed to join event',
        return_code: response.return_code
      };
    }

    return {
      success: true,
      event: response.event
    };
  } catch (error) {
    // Network/connection errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};

/**
 * Retrieves all events the authenticated user is a member of
 * Requires authentication.
 * @returns {Promise<Event[]>} - Array of events
 */
export const getMyEvents = async (): Promise<Event[]> => {
  const response = await apiCall<ApiResponse & { events: Event[] }>('/api/events/get_my_events', {});

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to retrieve events');
  }

  return response.events || [];
};

/**
 * Updates bank details for an event (host only)
 * Requires authentication.
 * @param {number} eventId - Event ID
 * @param {string} bankAccountNumber - Bank account number (optional)
 * @param {string} bankSortCode - Bank sort code (optional)
 * @param {string} bankAccountName - Bank account name (optional)
 * @returns {Promise<{bank_account_number?: string, bank_sort_code?: string, bank_account_name?: string}>}
 */
export const updateBankDetails = async (
  eventId: number,
  bankAccountNumber?: string,
  bankSortCode?: string,
  bankAccountName?: string
): Promise<{bank_account_number?: string, bank_sort_code?: string, bank_account_name?: string}> => {
  const response = await apiCall<ApiResponse & { event: {id: number, bank_account_number?: string, bank_sort_code?: string, bank_account_name?: string} }>('/api/events/update_bank_details', {
    event_id: eventId,
    bank_account_number: bankAccountNumber,
    bank_sort_code: bankSortCode,
    bank_account_name: bankAccountName,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to update bank details');
  }

  return response.event;
};

/**
 * Leaves an event (guest only)
 * Requires authentication.
 * @param {number} eventId - Event ID
 * @returns {Promise<ApiResponse>} - Leave event response
 */
export const leaveEvent = async (eventId: number): Promise<ApiResponse> => {
  const response = await apiCall<ApiResponse>('/api/events/leave_event', {
    event_id: eventId,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to leave event');
  }

  return response;
};

/**
 * Updates event settings (host only)
 * Requires authentication.
 * @param {number} eventId - Event ID
 * @param {object} settings - Settings to update
 * @returns {Promise<{id: number, name: string, payment_method?: string, bank_account_number?: string, bank_sort_code?: string, bank_account_name?: string, allow_guest_notes_edit?: boolean}>}
 */
export const updateEventSettings = async (
  eventId: number,
  settings: {
    event_name?: string;
    payment_method?: string;
    bank_account_number?: string;
    bank_sort_code?: string;
    bank_account_name?: string;
    allow_guest_notes_edit?: boolean;
  }
): Promise<{id: number, name: string, payment_method?: string, bank_account_number?: string, bank_sort_code?: string, bank_account_name?: string, allow_guest_notes_edit?: boolean}> => {
  const response = await apiCall<ApiResponse & { event: {id: number, name: string, payment_method?: string, bank_account_number?: string, bank_sort_code?: string, bank_account_name?: string, allow_guest_notes_edit?: boolean} }>('/api/events/update_event_settings', {
    event_id: eventId,
    ...settings,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to update event settings');
  }

  return response.event;
};

/**
 * Deletes an event and all associated data (host only)
 * Requires authentication.
 * @param {number} eventId - Event ID
 * @returns {Promise<ApiResponse>} - Delete event response
 */
export const deleteEvent = async (eventId: number): Promise<ApiResponse> => {
  const response = await apiCall<ApiResponse>('/api/events/delete_event', {
    event_id: eventId,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to delete event');
  }

  return response;
};

// =============================================================================
// Guest API Functions
// =============================================================================
/**
 * Retrieves all guests for a specific event
 * Requires authentication.
 * @param {number} eventId - Event ID
 * @returns {Promise<{success: boolean, guests?: Guest[], error?: string}>} - Result with guests or error
 */
export const getGuests = async (eventId: number): Promise<{success: boolean, guests?: Guest[], error?: string}> => {
  try {
    const response = await apiCall<ApiResponse & { guests: Guest[] }>('/api/guests/get_guests', {
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
  } catch {
    // Only network errors reach here
    return {
      success: false,
      error: 'Network error - please check your connection'
    };
  }
};

/**
 * Adds a new guest to an event
 * Requires authentication.
 * @param {number} eventId - Event ID
 * @param {string} name - Guest name
 * @param {number} amount - Total bill amount (optional)
 * @param {number} deposit - Deposit amount (optional)
 * @returns {Promise<Guest>} - Created guest
 */
export const addGuest = async (
  eventId: number,
  name: string,
  amount?: number,
  deposit?: number
): Promise<Guest> => {
  const response = await apiCall<ApiResponse & { guest: Guest }>('/api/guests/add_guest', {
    event_id: eventId,
    name: name,
    amount: amount || 0,
    deposit: deposit || 0,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to add guest');
  }

  return response.guest;
};

/**
 * Updates guest details
 * Requires authentication.
 * @param {number} guestId - Guest ID
 * @param {object} updates - Fields to update
 * @returns {Promise<Guest>} - Updated guest
 */
export const updateGuest = async (
  guestId: number,
  updates: {
    name?: string;
    amount?: number;
    deposit?: number;
    notes?: string;
    paid?: boolean;
  }
): Promise<Guest> => {
  const response = await apiCall<ApiResponse & { guest: Guest }>('/api/guests/update_guest', {
    guest_id: guestId,
    ...updates,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to update guest');
  }

  return response.guest;
};

/**
 * Deletes a guest from an event
 * Requires authentication.
 * @param {number} guestId - Guest ID
 * @returns {Promise<void>}
 */
export const deleteGuest = async (guestId: number): Promise<void> => {
  const response = await apiCall<ApiResponse>('/api/guests/delete_guest', {
    guest_id: guestId,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to delete guest');
  }
};

/**
 * Adds an item to a guest
 * Requires authentication.
 * @param {number} guestId - Guest ID
 * @param {string} note - Item note/description
 * @param {number} price - Item price (optional)
 * @returns {Promise<GuestItem>} - Created item
 */
export const addGuestItem = async (guestId: number, note: string, price?: number): Promise<GuestItem> => {
  const response = await apiCall<ApiResponse & { item: GuestItem }>('/api/guests/add_item', {
    guest_id: guestId,
    note: note,
    ...(price !== undefined && { price }),
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to add item');
  }

  return response.item;
};

/**
 * Deletes an item from a guest
 * Requires authentication.
 * @param {number} itemId - Item ID
 * @returns {Promise<void>}
 */
export const deleteGuestItem = async (itemId: number): Promise<void> => {
  const response = await apiCall<ApiResponse>('/api/guests/delete_item', {
    item_id: itemId,
  });

  if (response.return_code !== 'SUCCESS') {
    throw new Error(response.message || 'Failed to delete item');
  }
};

// =============================================================================
// Authentication Types
// =============================================================================
export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  return_code: string;
  token?: string;
  user?: AuthUser;
  message?: string;
}

// =============================================================================
// Authentication Functions
// =============================================================================
/**
 * Register a new user account
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<AuthResponse>} - Registration response
 */
export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  const response = await apiCall<AuthResponse>('/api/auth/register', {
    name,
    email,
    password
  });

  if (response.return_code === 'SUCCESS' && response.token) {
    // Store auth token in localStorage
    localStorage.setItem('auth_token', response.token);
    if (response.user) {
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    }
  }

  return response;
};

/**
 * Login with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<AuthResponse>} - Login response
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await apiCall<AuthResponse>('/api/auth/login', {
    email,
    password
  });

  if (response.return_code === 'SUCCESS' && response.token) {
    // Store auth token in localStorage
    localStorage.setItem('auth_token', response.token);
    if (response.user) {
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    }
  }

  return response;
};

/**
 * Logout current user
 */
export const logout = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};

/**
 * Get current logged-in user from localStorage
 * @returns {AuthUser | null} - Current user or null
 */
export const getCurrentUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('auth_user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Get current auth token from localStorage
 * @returns {string | null} - Auth token or null
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

/**
 * Check if user is logged in
 * @returns {boolean} - True if user has auth token
 */
export const isLoggedIn = (): boolean => {
  return getAuthToken() !== null;
};

/**
 * Update user profile (name and/or email)
 * @param {string} name - New name (optional)
 * @param {string} email - New email (optional)
 * @returns {Promise<AuthResponse>} - Update response with new token
 */
export const updateProfile = async (name?: string, email?: string): Promise<AuthResponse> => {
  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (email) updates.email = email;

  const response = await apiCall<AuthResponse>('/api/auth/update_profile', updates);

  if (response.return_code === 'SUCCESS' && response.token) {
    // Update stored token with new user info
    localStorage.setItem('auth_token', response.token);
    if (response.user) {
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    }
  }

  return response;
};

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<ApiResponse>} - Change password response
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
  const response = await apiCall<ApiResponse>('/api/auth/change_password', {
    current_password: currentPassword,
    new_password: newPassword
  });

  return response;
};

/**
 * Delete user account
 * @param {string} password - Password for confirmation
 * @returns {Promise<ApiResponse>} - Delete account response
 */
export const deleteAccount = async (password: string): Promise<ApiResponse> => {
  const response = await apiCall<ApiResponse>('/api/auth/delete_account', {
    password
  });

  if (response.return_code === 'SUCCESS') {
    // Clear local storage on successful deletion
    logout();
  }

  return response;
};

/**
 * Request password reset email
 * @param {string} email - User's email address
 * @returns {Promise<ApiResponse>} - Forgot password response
 */
export const forgotPassword = async (email: string): Promise<ApiResponse> => {
  const response = await apiCall<ApiResponse>('/api/auth/forgot_password', {
    email
  });

  return response;
};

/**
 * Reset password using token from email
 * @param {string} token - Reset token from email link
 * @param {string} newPassword - New password
 * @returns {Promise<ApiResponse>} - Reset password response
 */
export const resetPassword = async (token: string, newPassword: string): Promise<ApiResponse> => {
  const response = await apiCall<ApiResponse>('/api/auth/reset_password', {
    token,
    new_password: newPassword
  });

  return response;
};

// =============================================================================
// Guest Claiming Functions
// =============================================================================
/**
 * Claims an unclaimed guest profile for the current user
 * @param {number} eventId - Event ID
 * @param {number} guestId - Guest ID to claim
 * @returns {Promise<{success: boolean, guest?: Guest, error?: string, return_code?: string}>} - Result with guest or error
 */
export const claimGuest = async (eventId: number, guestId: number): Promise<{success: boolean, guest?: Guest, error?: string, return_code?: string}> => {
  try {
    const response = await apiCall<ApiResponse & { guest: Guest }>('/api/guests/claim_guest', {
      event_id: eventId,
      guest_id: guestId,
    });

    if (response.return_code !== 'SUCCESS') {
      return {
        success: false,
        error: response.message || 'Failed to claim guest',
        return_code: response.return_code
      };
    }

    return {
      success: true,
      guest: response.guest
    };
  } catch (error) {
    // Network/connection errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};

/**
 * Unclaims the current user's claimed guest in an event
 * @param {number} eventId - Event ID
 * @returns {Promise<{success: boolean, error?: string, return_code?: string}>} - Result with success or error
 */
export const unclaimGuest = async (eventId: number): Promise<{success: boolean, error?: string, return_code?: string}> => {
  try {
    const response = await apiCall<ApiResponse>('/api/guests/unclaim_guest', {
      event_id: eventId,
    });

    if (response.return_code !== 'SUCCESS') {
      return {
        success: false,
        error: response.message || 'Failed to unclaim guest',
        return_code: response.return_code
      };
    }

    return {
      success: true
    };
  } catch (error) {
    // Network/connection errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};

/**
 * Retrieves the guest claimed by the current user in an event
 * @param {number} eventId - Event ID
 * @returns {Promise<{success: boolean, guest?: Guest | null, error?: string}>} - Result with guest (null if none claimed) or error
 */
export const getMyClaimedGuest = async (eventId: number): Promise<{success: boolean, guest?: Guest | null, error?: string}> => {
  try {
    const response = await apiCall<ApiResponse & { guest: Guest | null }>('/api/guests/get_my_claimed_guest', {
      event_id: eventId,
    });

    if (response.return_code !== 'SUCCESS') {
      return {
        success: false,
        error: response.message || 'Failed to retrieve claimed guest'
      };
    }

    return {
      success: true,
      guest: response.guest
    };
  } catch (error) {
    // Network/connection errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
};

// =============================================================================
// Error Handling Helper
// =============================================================================
/**
 * Checks if error is a network/server error (should fallback to localStorage)
 * @param {any} error - Error object
 * @returns {boolean} - True if should fallback to localStorage
 */
export const shouldFallbackToLocalStorage = (error: unknown): boolean => {
  // Network errors, server down, CORS issues, etc.
  if (error instanceof TypeError) {
    return true;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message);
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('CORS') ||
      message.includes('ERR_CONNECTION_REFUSED')
    );
  }

  return false;
};
