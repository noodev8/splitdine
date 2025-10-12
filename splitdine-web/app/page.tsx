'use client';

import { useState, useRef, useEffect } from 'react';
import {
  createEvent as apiCreateEvent,
  joinEvent as apiJoinEvent,
  getMyEvents as apiGetMyEvents,
  updateBankDetails as apiUpdateBankDetails,
  getGuests as apiGetGuests,
  addGuest as apiAddGuest,
  updateGuest as apiUpdateGuest,
  deleteGuest as apiDeleteGuest,
  addGuestItem as apiAddGuestItem,
  deleteGuestItem as apiDeleteGuestItem,
  register as apiRegister,
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  forgotPassword as apiForgotPassword
} from '@/lib/api-client';

interface Item {
  id: string;
  note: string;
}

interface Guest {
  id: string;
  name: string;
  amount: number;
  deposit: number;
  items: Item[];
  notes: string;
  paid: boolean;
}

interface Event {
  id: string;
  name: string;
  hostCode: string;
  guestCode: string;
  guests: Guest[];
  createdAt: number;
  bankAccountNumber?: string;
  bankSortCode?: string;
  bankAccountName?: string;
}

interface UserEventMembership {
  eventId: string;
  role: 'host' | 'guest';
  joinedAt: number;
}

export default function Home() {

  // Event system state
  const [events, setEvents] = useState<Event[]>([]);
  const [userMemberships, setUserMemberships] = useState<UserEventMembership[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'host' | 'guest' | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Guest management state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [deposit, setDeposit] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [itemNote, setItemNote] = useState('');
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDeposit, setEditDeposit] = useState('');
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  // Event creation/join state
  const [showStartEventModal, setShowStartEventModal] = useState(false);
  const [showJoinEventModal, setShowJoinEventModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRegisterRequiredModal, setShowRegisterRequiredModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Bank details modal state (per-event)
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showEventCodes, setShowEventCodes] = useState(false);
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [editBankSortCode, setEditBankSortCode] = useState('');
  const [editBankAccountName, setEditBankAccountName] = useState('');

  // Event name editing state
  const [isEditingEventName, setIsEditingEventName] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const eventNameInputRef = useRef<HTMLInputElement>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const itemNoteRef = useRef<HTMLInputElement>(null);
  const editAmountRef = useRef<HTMLInputElement>(null);
  const eventNameRef = useRef<HTMLInputElement>(null);
  const joinCodeRef = useRef<HTMLInputElement>(null);

  // Toast notification helper
  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Helper function to load guests for an event (hybrid approach)
  const loadGuestsForEvent = async (eventId: string): Promise<Guest[]> => {
    try {
      const apiGuests = await apiGetGuests(parseInt(eventId));

      // Convert API guests to local format
      const convertedApiGuests: Guest[] = apiGuests.map(apiGuest => ({
        id: apiGuest.id.toString(),
        name: apiGuest.name,
        amount: apiGuest.amount,
        deposit: apiGuest.deposit,
        items: apiGuest.items.map(item => ({
          id: item.id.toString(),
          note: item.note
        })),
        notes: apiGuest.notes,
        paid: apiGuest.paid
      }));

      // Update event with API guests
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, guests: convertedApiGuests } : e
      ));

      return convertedApiGuests;
    } catch (error) {
      console.error('Error loading guests from API:', error);
      showToastNotification('Failed to load guests. Please try again.');
      return [];
    }
  };

  // Load current user on mount
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Load events and memberships from API on mount
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoadingEvents(true);

      try {
        const apiEvents = await apiGetMyEvents();

        // Convert API events to local format
        const convertedApiEvents: Event[] = apiEvents.map(apiEvent => ({
          id: apiEvent.id.toString(),
          name: apiEvent.name,
          hostCode: apiEvent.host_code || '',
          guestCode: apiEvent.guest_code,
          guests: [], // Will be loaded when user opens the event
          createdAt: new Date(apiEvent.created_at).getTime(),
          bankAccountNumber: apiEvent.bank_account_number,
          bankSortCode: apiEvent.bank_sort_code,
          bankAccountName: apiEvent.bank_account_name,
        }));

        // Create memberships from API data
        const convertedApiMemberships: UserEventMembership[] = apiEvents.map(apiEvent => ({
          eventId: apiEvent.id.toString(),
          role: apiEvent.role,
          joinedAt: apiEvent.joined_at ? new Date(apiEvent.joined_at).getTime() : Date.now(),
        }));

        setEvents(convertedApiEvents);
        setUserMemberships(convertedApiMemberships);
      } catch (error) {
        console.error('Error loading events from API:', error);
        showToastNotification('Failed to load events. Please check your connection.');
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadEvents();
  }, []);

  // Update current event's guests whenever guests change
  useEffect(() => {
    if (currentEventId) {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === currentEventId
            ? { ...event, guests: guests }
            : event
        )
      );
    }
  }, [guests, currentEventId]);

  // Handle Escape key for Delete Confirm modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteConfirmModal) {
        setShowDeleteConfirmModal(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showDeleteConfirmModal]);

  // Authentication functions
  const handleLogin = async () => {
    setAuthError('');

    if (!loginEmail.trim() || !loginPassword) {
      setAuthError('Please enter both email and password');
      return;
    }

    try {
      const response = await apiLogin(loginEmail, loginPassword);

      if (response.return_code === 'SUCCESS' && response.user) {
        setCurrentUser(response.user);
        setShowLoginModal(false);
        setLoginEmail('');
        setLoginPassword('');
        showToastNotification(`Welcome back, ${response.user.name}!`);
      } else {
        setAuthError(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('An error occurred during login');
    }
  };

  const handleRegister = async () => {
    setAuthError('');

    if (!registerName.trim() || !registerEmail.trim() || !registerPassword) {
      setAuthError('Please fill in all fields');
      return;
    }

    if (registerPassword.length < 8) {
      setAuthError('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await apiRegister(registerName, registerEmail, registerPassword);

      if (response.return_code === 'SUCCESS' && response.user) {
        // After successful registration, log them in
        setCurrentUser(response.user);
        setShowRegisterModal(false);
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPassword('');
        showToastNotification(`Welcome to SplitDine, ${response.user.name}!`);
      } else {
        setAuthError(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Register error:', error);
      setAuthError('An error occurred during registration');
    }
  };

  const handleLogout = () => {
    apiLogout();
    setCurrentUser(null);
    showToastNotification('Logged out successfully');
  };

  const handleForgotPassword = async () => {
    setAuthError('');

    if (!forgotPasswordEmail.trim()) {
      setAuthError('Please enter your email address');
      return;
    }

    setIsSendingResetEmail(true);

    try {
      const response = await apiForgotPassword(forgotPasswordEmail);

      if (response.return_code === 'SUCCESS') {
        setShowForgotPasswordModal(false);
        setForgotPasswordEmail('');
        showToastNotification('Password reset link sent! Check your email.');
      } else {
        setAuthError(response.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setAuthError('An error occurred. Please try again.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Bank details functions
  const openBankDetailsModal = () => {
    const currentEvent = events.find(e => e.id === currentEventId);
    if (currentEvent) {
      setEditBankAccountNumber(currentEvent.bankAccountNumber || '');
      setEditBankSortCode(currentEvent.bankSortCode || '');
      setEditBankAccountName(currentEvent.bankAccountName || '');
    } else {
      setEditBankAccountNumber('');
      setEditBankSortCode('');
      setEditBankAccountName('');
    }
    setShowBankDetailsModal(true);
  };

  const saveBankDetails = async () => {
    if (!currentEventId) return;

    try {
      // Update bank details via API
      await apiUpdateBankDetails(
        parseInt(currentEventId),
        editBankAccountNumber || undefined,
        editBankSortCode || undefined,
        editBankAccountName || undefined
      );

      // Update local state
      setEvents(events.map(e =>
        e.id === currentEventId
          ? {
              ...e,
              bankAccountNumber: editBankAccountNumber || undefined,
              bankSortCode: editBankSortCode || undefined,
              bankAccountName: editBankAccountName || undefined
            }
          : e
      ));

      setShowBankDetailsModal(false);
    } catch (error) {
      console.error('Error updating bank details:', error);
      showToastNotification('Failed to update bank details. Please try again.');
    }
  };

  // Event name editing functions
  const startEditingEventName = () => {
    if (userRole !== 'host' || !currentEvent) return;
    setEditEventName(currentEvent.name);
    setIsEditingEventName(true);
    setTimeout(() => eventNameInputRef.current?.select(), 0);
  };

  const saveEventName = () => {
    if (!currentEventId || !editEventName.trim()) {
      setIsEditingEventName(false);
      return;
    }

    // Update event name in local state
    setEvents(events.map(e =>
      e.id === currentEventId ? { ...e, name: editEventName.trim() } : e
    ));
    setIsEditingEventName(false);
    // TODO: Sync with API when backend endpoint is available
  };

  const cancelEditEventName = () => {
    setIsEditingEventName(false);
    setEditEventName('');
  };

  // Event functions
  const startNewEvent = async () => {
    if (eventName.trim()) {
      try {
        // Try API first (hybrid approach)
        const apiEvent = await apiCreateEvent(eventName.trim());

        // Convert API event to local format
        const newEvent: Event = {
          id: apiEvent.id.toString(),
          name: apiEvent.name,
          hostCode: apiEvent.host_code || '',
          guestCode: apiEvent.guest_code,
          guests: [],
          createdAt: new Date(apiEvent.created_at).getTime(),
          bankAccountNumber: apiEvent.bank_account_number,
          bankSortCode: apiEvent.bank_sort_code,
          bankAccountName: apiEvent.bank_account_name,
        };

        const newMembership: UserEventMembership = {
          eventId: newEvent.id,
          role: 'host',
          joinedAt: Date.now(),
        };

        setEvents([...events, newEvent]);
        setUserMemberships([...userMemberships, newMembership]);
        setCurrentEventId(newEvent.id);
        setUserRole('host');
        setGuests([]);
        setEventName('');
        setShowStartEventModal(false);
      } catch (error) {
        console.error('API error creating event:', error);
        showToastNotification('Failed to create event. Please check your connection.');
      }
    }
  };

  const copyGuestCode = (code: string) => {
    const shareMessage = `Join my SplitDine event!\n\nEvent: ${currentEvent?.name}\nGuest Code: ${code}\n\nGo to https://www.splitdine.com and enter this code to join.\n\nQuestions? Email us at info@splitdine.com`;
    navigator.clipboard.writeText(shareMessage);
    showToastNotification('Guest invite copied! Ready to share.');
  };

  const joinEvent = async () => {
    const code = joinCode.trim().toUpperCase();

    if (!code) {
      showToastNotification('Please enter an event code');
      return;
    }

    // Try API call
    const result = await apiJoinEvent(code);

    if (result.success && result.event) {
      // API success - convert to local format
      const apiEvent = result.event;
      const newEvent: Event = {
        id: apiEvent.id.toString(),
        name: apiEvent.name,
        hostCode: apiEvent.host_code || '',
        guestCode: apiEvent.guest_code,
        guests: [],
        createdAt: new Date(apiEvent.created_at).getTime(),
        bankAccountNumber: apiEvent.bank_account_number,
        bankSortCode: apiEvent.bank_sort_code,
        bankAccountName: apiEvent.bank_account_name,
      };

      // Check if event already exists in local state
      const existingEvent = events.find(e => e.id === newEvent.id);
      if (!existingEvent) {
        setEvents([...events, newEvent]);
      }

      // Check if already a member
      const existingMembership = userMemberships.find(m => m.eventId === newEvent.id);
      if (!existingMembership) {
        const newMembership: UserEventMembership = {
          eventId: newEvent.id,
          role: apiEvent.role,
          joinedAt: Date.now(),
        };
        setUserMemberships([...userMemberships, newMembership]);
      }

      setCurrentEventId(newEvent.id);
      setUserRole(apiEvent.role);
      setJoinCode('');
      setJoinCodeError('');
      setShowJoinEventModal(false);

      // Load guests from API immediately after joining
      const loadedGuests = await loadGuestsForEvent(newEvent.id);
      setGuests(loadedGuests);
    } else {
      // API failed - show appropriate error message
      if (result.return_code === 'EVENT_NOT_FOUND') {
        setJoinCodeError('Invalid code');
      } else {
        setJoinCodeError('Failed to join event. Please check your connection.');
      }
    }
  };

  const leaveEvent = () => {
    setCurrentEventId(null);
    setUserRole(null);
    setGuests([]);
  };

  const openEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    const membership = userMemberships.find(m => m.eventId === eventId);

    if (event && membership) {
      setCurrentEventId(eventId);
      setUserRole(membership.role);

      // Load guests from API (hybrid approach)
      const loadedGuests = await loadGuestsForEvent(eventId);
      setGuests(loadedGuests);
    }
  };

  const confirmDeleteEvent = () => {
    if (!currentEventId || userRole !== 'host') return;

    // Remove event from events list
    setEvents(events.filter(e => e.id !== currentEventId));
    // Remove all memberships for this event
    setUserMemberships(userMemberships.filter(m => m.eventId !== currentEventId));
    // Clear current event
    setCurrentEventId(null);
    setUserRole(null);
    setGuests([]);
    setShowDeleteConfirmModal(false);
  };

  // Guest functions
  const addGuest = async () => {
    if (!name.trim() || !currentEventId) return;

    const guestName = name.trim();
    const guestAmount = parseFloat(amount) || 0;
    const guestDeposit = parseFloat(deposit) || 0;

    try {
      // Try API first (hybrid approach)
      const apiGuest = await apiAddGuest(
        parseInt(currentEventId),
        guestName,
        guestAmount,
        guestDeposit
      );

      // Convert API guest to local format
      const newGuest: Guest = {
        id: apiGuest.id.toString(),
        name: apiGuest.name,
        amount: apiGuest.amount,
        deposit: apiGuest.deposit,
        items: apiGuest.items.map(item => ({
          id: item.id.toString(),
          note: item.note
        })),
        notes: apiGuest.notes,
        paid: apiGuest.paid,
      };

      setGuests([...guests, newGuest]);
      setName('');
      setAmount('');
      setDeposit('');
      nameInputRef.current?.focus();
    } catch (error) {
      console.error('Error adding guest via API:', error);
      showToastNotification('Failed to add guest. Please try again.');
    }
  };

  const removeGuest = async (id: string) => {
    if (userRole !== 'host') return;

    // Always delete from local state first (immediate UI feedback)
    setGuests(guests.filter((guest) => guest.id !== id));
    if (selectedGuestId === id) {
      setSelectedGuestId(null);
    }

    // Check if this is a database guest (not local-only timestamp ID)
    const isFromDatabase = parseInt(id) <= 2147483647; // Max PostgreSQL INTEGER

    if (isFromDatabase) {
      // Try to sync deletion with API
      try {
        await apiDeleteGuest(parseInt(id));
      } catch (error) {
        console.error('Error deleting guest from API:', error);
        // Guest already deleted locally, so we don't need to show an error
        // unless it's a non-network error (which would be unusual for delete)
      }
    }
  };

  const selectGuest = (id: string) => {
    setEditingGuestId(id);
    setShowItemsModal(true);
    setTimeout(() => itemNoteRef.current?.focus(), 0);
  };

  const addItemToGuest = async () => {
    if (!editingGuestId || !itemNote.trim()) return;

    const noteText = itemNote.trim();

    try {
      // Try API first (hybrid approach)
      const apiItem = await apiAddGuestItem(parseInt(editingGuestId), noteText);

      // Convert API item to local format and update state
      const newItem = {
        id: apiItem.id.toString(),
        note: apiItem.note
      };

      setGuests(
        guests.map((guest) =>
          guest.id === editingGuestId
            ? {
                ...guest,
                items: [...guest.items, newItem],
              }
            : guest
        )
      );
      setItemNote('');
      itemNoteRef.current?.focus();
    } catch (error) {
      console.error('Error adding item via API:', error);
      showToastNotification('Failed to add item. Please try again.');
    }
  };

  const removeItem = async (guestId: string, itemId: string) => {
    // Always delete from local state first (immediate UI feedback)
    setGuests(
      guests.map((guest) =>
        guest.id === guestId
          ? {
              ...guest,
              items: guest.items.filter((item) => item.id !== itemId),
            }
          : guest
      )
    );

    // Check if this is a database item (not local-only timestamp ID)
    const isFromDatabase = parseInt(itemId) <= 2147483647; // Max PostgreSQL INTEGER

    if (isFromDatabase) {
      // Try to sync deletion with API
      try {
        await apiDeleteGuestItem(parseInt(itemId));
      } catch (error) {
        console.error('Error deleting item from API:', error);
        // Item already deleted locally, so we don't need to show an error
      }
    }
  };

  const startEditingAmount = (guestId: string, currentAmount: number, currentDeposit: number) => {
    if (userRole === 'host') {
      setEditingAmountId(guestId);
      setEditAmount(currentAmount.toString());
      setEditDeposit(currentDeposit.toString());
      setTimeout(() => editAmountRef.current?.select(), 0);
    }
  };

  const saveAmount = async () => {
    if (!editingAmountId || !editAmount) return;

    const newAmount = parseFloat(editAmount) || 0;
    const newDeposit = parseFloat(editDeposit) || 0;

    // Always update local state first (immediate UI feedback)
    setGuests(
      guests.map((guest) =>
        guest.id === editingAmountId
          ? {
              ...guest,
              amount: newAmount,
              deposit: newDeposit
            }
          : guest
      )
    );

    // Clear editing state
    setEditingAmountId(null);
    setEditAmount('');
    setEditDeposit('');

    // Check if this is a database guest (not local-only timestamp ID)
    const isFromDatabase = parseInt(editingAmountId) <= 2147483647; // Max PostgreSQL INTEGER

    if (isFromDatabase) {
      // Try to sync with API
      try {
        await apiUpdateGuest(parseInt(editingAmountId), {
          amount: newAmount,
          deposit: newDeposit
        });
      } catch (error) {
        console.error('Error syncing amount update to API:', error);
        // Already updated locally, no need to show error
      }
    }
  };

  const cancelEditAmount = () => {
    setEditingAmountId(null);
    setEditAmount('');
    setEditDeposit('');
  };

  const togglePaid = async (guestId: string) => {
    if (userRole !== 'host') return;

    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;

    const newPaidStatus = !guest.paid;

    // Always update local state first (immediate UI feedback)
    setGuests(
      guests.map((g) =>
        g.id === guestId
          ? { ...g, paid: newPaidStatus }
          : g
      )
    );

    // Check if this is a database guest (not local-only timestamp ID)
    const isFromDatabase = parseInt(guestId) <= 2147483647; // Max PostgreSQL INTEGER

    if (isFromDatabase) {
      // Try to sync with API
      try {
        await apiUpdateGuest(parseInt(guestId), {
          paid: newPaidStatus
        });
      } catch (error) {
        console.error('Error syncing paid status to API:', error);
        // Already updated locally, no need to show error
      }
    }
  };

  const closeItemsModal = async () => {
    if (!editingGuestId) return;

    const guest = guests.find(g => g.id === editingGuestId);
    if (!guest) return;

    // Close modal first (immediate UI feedback)
    setShowItemsModal(false);
    setEditingGuestId(null);
    setItemNote('');

    // Check if this is a database guest (not local-only timestamp ID)
    const isFromDatabase = parseInt(editingGuestId) <= 2147483647; // Max PostgreSQL INTEGER

    if (isFromDatabase) {
      // Try to sync notes to API
      try {
        await apiUpdateGuest(parseInt(editingGuestId), {
          notes: guest.notes
        });
      } catch (error) {
        console.error('Error syncing notes to API:', error);
        // Local state already saved, no need to show error
      }
    }
  };

  const totalBill = guests.reduce((sum, guest) => sum + guest.amount, 0);
  const totalDeposits = guests.reduce((sum, guest) => sum + guest.deposit, 0);
  const totalOwed = guests.reduce((sum, guest) => {
    if (!guest.paid) {
      return sum + (guest.amount - guest.deposit);
    }
    return sum;
  }, 0);
  const editingGuest = guests.find((g) => g.id === editingGuestId);
  const currentEvent = events.find((e) => e.id === currentEventId);

  // Get user's events sorted by join time
  const myEvents = userMemberships
    .map(m => {
      const event = events.find(e => e.id === m.eventId);
      return event ? { ...event, userRole: m.role, joinedAt: m.joinedAt } : null;
    })
    .filter(e => e !== null)
    .sort((a, b) => b!.joinedAt - a!.joinedAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          {/* Left side - Logo or Home button + Event Name */}
          <div className="flex items-center gap-4">
            {currentEvent ? (
              <>
                <button
                  onClick={leaveEvent}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                >
                  ← Home
                </button>
                {isEditingEventName ? (
                  <input
                    ref={eventNameInputRef}
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEventName();
                      if (e.key === 'Escape') cancelEditEventName();
                    }}
                    onBlur={saveEventName}
                    className="px-2 py-1 text-sm text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 border-2 border-blue-500 rounded focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={startEditingEventName}
                    className={`text-sm ${userRole === 'host' ? 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer' : 'text-slate-600 dark:text-slate-300 cursor-default'} transition-colors flex items-center gap-1`}
                    disabled={userRole !== 'host'}
                  >
                    {currentEvent.name}
                    {userRole === 'host' && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 opacity-50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                    )}
                  </button>
                )}
              </>
            ) : (
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-100">
                SplitDine
              </h1>
            )}
          </div>

          {/* Right side - Auth buttons on home page only */}
          <div>
            {!currentEvent && (
              currentUser ? (
                <div className="relative group">
                  <button className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-colors font-medium text-sm">
                    {currentUser.name}
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors font-medium text-sm"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Register
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Start Event Modal */}
        {showStartEventModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Start New Event
              </h2>
              <input
                ref={eventNameRef}
                type="text"
                placeholder="Event name (e.g., Pizza Express - Oct 11)"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') startNewEvent();
                  if (e.key === 'Escape') {
                    setShowStartEventModal(false);
                    setEventName('');
                  }
                }}
                className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStartEventModal(false);
                    setEventName('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startNewEvent}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Start Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowLoginModal(false);
              setLoginEmail('');
              setLoginPassword('');
              setAuthError('');
            }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Sign In
              </h2>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin();
                    if (e.key === 'Escape') {
                      setShowLoginModal(false);
                      setLoginEmail('');
                      setLoginPassword('');
                      setAuthError('');
                    }
                  }}
                  className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin();
                    if (e.key === 'Escape') {
                      setShowLoginModal(false);
                      setLoginEmail('');
                      setLoginPassword('');
                      setAuthError('');
                    }
                  }}
                  className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="mt-2 text-right">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowForgotPasswordModal(true);
                    setLoginEmail('');
                    setLoginPassword('');
                    setAuthError('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginEmail('');
                    setLoginPassword('');
                    setAuthError('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogin}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Sign In
                </button>
              </div>

              <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowRegisterModal(true);
                    setLoginEmail('');
                    setLoginPassword('');
                    setAuthError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Register Modal */}
        {showRegisterModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowRegisterModal(false);
              setRegisterName('');
              setRegisterEmail('');
              setRegisterPassword('');
              setAuthError('');
            }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Create Account
              </h2>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRegister();
                    if (e.key === 'Escape') {
                      setShowRegisterModal(false);
                      setRegisterName('');
                      setRegisterEmail('');
                      setRegisterPassword('');
                      setAuthError('');
                    }
                  }}
                  className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRegister();
                    if (e.key === 'Escape') {
                      setShowRegisterModal(false);
                      setRegisterName('');
                      setRegisterEmail('');
                      setRegisterPassword('');
                      setAuthError('');
                    }
                  }}
                  className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
                <input
                  type="password"
                  placeholder="Password (min 8 characters)"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRegister();
                    if (e.key === 'Escape') {
                      setShowRegisterModal(false);
                      setRegisterName('');
                      setRegisterEmail('');
                      setRegisterPassword('');
                      setAuthError('');
                    }
                  }}
                  className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRegisterModal(false);
                    setRegisterName('');
                    setRegisterEmail('');
                    setRegisterPassword('');
                    setAuthError('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create Account
                </button>
              </div>

              <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setShowRegisterModal(false);
                    setShowLoginModal(true);
                    setRegisterName('');
                    setRegisterEmail('');
                    setRegisterPassword('');
                    setAuthError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Register Required Modal */}
        {showRegisterRequiredModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Create an Account
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                To create events, please register for a free account. This allows you to access your events from any device and ensures you never lose your data.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowRegisterRequiredModal(false);
                    setShowRegisterModal(true);
                  }}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Register
                </button>
                <button
                  onClick={() => {
                    setShowRegisterRequiredModal(false);
                    setShowLoginModal(true);
                  }}
                  className="w-full px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Already have an account? Log In
                </button>
                <button
                  onClick={() => setShowRegisterRequiredModal(false)}
                  className="w-full px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        {showForgotPasswordModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowForgotPasswordModal(false);
              setForgotPasswordEmail('');
              setAuthError('');
            }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Reset Password
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <input
                type="email"
                placeholder="Email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleForgotPassword();
                  if (e.key === 'Escape') {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordEmail('');
                    setAuthError('');
                  }
                }}
                className="w-full px-4 py-3 text-base border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 mb-6"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordEmail('');
                    setAuthError('');
                  }}
                  disabled={isSendingResetEmail}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForgotPassword}
                  disabled={isSendingResetEmail}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSendingResetEmail ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Remember your password?{' '}
                <button
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setShowLoginModal(true);
                    setForgotPasswordEmail('');
                    setAuthError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Event Modal */}
        {showJoinEventModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
                Join Event
              </h2>
              <input
                ref={joinCodeRef}
                type="text"
                placeholder="Enter event code"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinCodeError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') joinEvent();
                  if (e.key === 'Escape') {
                    setShowJoinEventModal(false);
                    setJoinCode('');
                    setJoinCodeError('');
                  }
                }}
                className="w-full px-4 py-3 text-base border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 mb-2 uppercase"
              />
              {joinCodeError && (
                <p className="text-red-600 dark:text-red-400 text-sm mb-4">{joinCodeError}</p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowJoinEventModal(false);
                    setJoinCode('');
                    setJoinCodeError('');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={joinEvent}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Join Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Event Confirmation Modal */}
        {showDeleteConfirmModal && currentEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-5 max-w-sm w-full">
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-600 dark:text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Delete Event?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Are you sure you want to delete <span className="font-semibold">&quot;{currentEvent.name}&quot;</span>?
                </p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bank Details Edit Modal */}
        {showBankDetailsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Edit Bank Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                These details are saved to your device and will be used for all events.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={editBankAccountNumber}
                    onChange={(e) => setEditBankAccountNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveBankDetails();
                      if (e.key === 'Escape') setShowBankDetailsModal(false);
                    }}
                    className="w-full px-4 py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Sort Code
                  </label>
                  <input
                    type="text"
                    value={editBankSortCode}
                    onChange={(e) => setEditBankSortCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveBankDetails();
                      if (e.key === 'Escape') setShowBankDetailsModal(false);
                    }}
                    placeholder="e.g., 04-00-03"
                    className="w-full px-4 py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={editBankAccountName}
                    onChange={(e) => setEditBankAccountName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveBankDetails();
                      if (e.key === 'Escape') setShowBankDetailsModal(false);
                    }}
                    className="w-full px-4 py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBankDetailsModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBankDetails}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {!currentEvent ? (
          /* Landing Page */
          <div className="space-y-8">
            {/* Hero Section - Only show for anonymous users */}
            {!currentUser && (
              <div className="max-w-3xl mx-auto text-center pt-8 pb-4">
                <h1 className="text-3xl sm:text-4xl font-light text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
                  Bill Splitting Made Easy
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-400 font-light">
                  Smooth and seamless for guests, hosts, and restaurants
                </p>
              </div>
            )}

            {/* Action Buttons - Above the fold */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                onClick={() => {
                  if (currentUser) {
                    setShowStartEventModal(true);
                    setTimeout(() => eventNameRef.current?.focus(), 0);
                  } else {
                    setShowRegisterRequiredModal(true);
                  }
                }}
                className="w-full sm:w-auto px-8 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
              >
                Start Event
              </button>
              <button
                onClick={() => {
                  setShowJoinEventModal(true);
                  setTimeout(() => joinCodeRef.current?.focus(), 0);
                }}
                className="w-full sm:w-auto px-8 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded transition-colors"
              >
                Join Event
              </button>
            </div>

            {/* Features Section - Only show for anonymous users */}
            {!currentUser && (
              <div className="max-w-4xl mx-auto pt-12 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 tracking-wide uppercase">
                      For Guests
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                      Manage your payments and share of the bill easily
                    </p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 tracking-wide uppercase">
                      For Hosts
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                      Manage the final bill seamlessly
                    </p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 tracking-wide uppercase">
                      Free
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                      Register once, create unlimited events
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* How It Works Section - Only show for anonymous users */}
            {!currentUser && (
              <div className="max-w-4xl mx-auto pt-16 pb-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
                  <h2 className="text-2xl font-light text-center text-slate-800 dark:text-slate-100 mb-12">
                    How It Works
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <span className="text-lg font-medium text-slate-700 dark:text-slate-300">1</span>
                    </div>
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-2">
                      Create Event
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                      Register and start a new event for your meal or gathering
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <span className="text-lg font-medium text-slate-700 dark:text-slate-300">2</span>
                    </div>
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-2">
                      Add Guests
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                      Share the code with guests who track their items and amounts
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <span className="text-lg font-medium text-slate-700 dark:text-slate-300">3</span>
                    </div>
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-2">
                      Settle Up
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                      Share payment details and everyone pays their fair share
                    </p>
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* Use Cases Section - Only show for anonymous users */}
            {!currentUser && (
              <div className="max-w-4xl mx-auto pt-8 pb-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
                  <h2 className="text-2xl font-light text-center text-slate-800 dark:text-slate-100 mb-10">
                    Perfect For Any Group Meal
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-3">
                        Restaurant Dinners
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                        Friends splitting the bill after a night out
                      </p>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-3">
                        Office Lunches
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                        Team orders where everyone pays their share
                      </p>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-3">
                        Group Celebrations
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                        Birthday parties, reunions, and special events
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Showcase - Only show for anonymous users */}
            {!currentUser && (
              <div className="max-w-5xl mx-auto pt-8 pb-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
                  <h2 className="text-2xl font-light text-center text-slate-800 dark:text-slate-100 mb-10">
                    Simple Interface
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Guest View Mockup */}
                    <div>
                      <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-4 text-center">
                        Guest View
                      </h3>
                      <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
                        {/* Total Bill */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-3">
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Restaurant Bill Total</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">£84.00</div>
                          </div>
                          <div className="grid grid-cols-2 gap-0 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-center border-r border-slate-200 dark:border-slate-700">
                              <div className="text-xs text-slate-500 dark:text-slate-400">Deposits</div>
                              <div className="text-base font-bold text-slate-700 dark:text-slate-200">£15.00</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400">Still Owed</div>
                              <div className="text-base font-bold text-orange-600 dark:text-orange-400">£69.00</div>
                            </div>
                          </div>
                        </div>

                        {/* Guest List */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">Guests (3)</div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded">
                              <span className="text-sm text-slate-800 dark:text-slate-100">Sarah</span>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">£28.00</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded">
                              <span className="text-sm text-slate-800 dark:text-slate-100">Mike</span>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">£18.50</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded border-2 border-blue-200 dark:border-blue-700">
                              <span className="text-sm text-slate-800 dark:text-slate-100">Emma</span>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">£22.50</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Details */}
                        <div className="mt-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">Payment Details ▼</div>
                        </div>
                      </div>
                      <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3 font-light">
                        See your share and track payments
                      </p>
                    </div>

                    {/* Host View Mockup */}
                    <div>
                      <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-4 text-center">
                        Host Dashboard
                      </h3>
                      <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
                        {/* Total Bill - Same as guest */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-3">
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Restaurant Bill Total</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">£84.00</div>
                          </div>
                          <div className="grid grid-cols-2 gap-0 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-center border-r border-slate-200 dark:border-slate-700">
                              <div className="text-xs text-slate-500 dark:text-slate-400">Deposits</div>
                              <div className="text-base font-bold text-slate-700 dark:text-slate-200">£15.00</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400">Still Owed</div>
                              <div className="text-base font-bold text-orange-600 dark:text-orange-400">£69.00</div>
                            </div>
                          </div>
                        </div>

                        {/* Add Guest Form */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-3">
                          <div className="flex gap-2">
                            <div className="flex-1 h-7 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded flex items-center px-2">
                              <span className="text-xs text-slate-400">Guest name</span>
                            </div>
                            <div className="w-16 h-7 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded flex items-center px-2">
                              <span className="text-xs text-slate-400">£0</span>
                            </div>
                            <div className="h-7 px-3 bg-blue-600 rounded flex items-center">
                              <span className="text-xs text-white font-medium">Add</span>
                            </div>
                          </div>
                        </div>

                        {/* Guest List */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">Guests (3)</div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-green-500 bg-green-500 rounded flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                </div>
                                <span className="text-sm text-slate-400 dark:text-slate-500 line-through">Sarah</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">£28.00</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 rounded"></div>
                                <span className="text-sm text-slate-800 dark:text-slate-100">Mike</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">£18.50</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 rounded"></div>
                                <span className="text-sm text-slate-800 dark:text-slate-100">Emma</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">£22.50</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3 font-light">
                        Add guests and track who has paid
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social Proof Section - Only show for anonymous users */}
            {!currentUser && (
              <div className="max-w-4xl mx-auto pt-8 pb-16">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div>
                      <div className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-2">
                        No More Math
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                        Automatic calculations mean no awkward moments
                      </p>
                    </div>
                    <div>
                      <div className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-2">
                        Save Time
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                        Quick setup and instant sharing for everyone
                      </p>
                    </div>
                    <div>
                      <div className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-2">
                        Fair & Clear
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                        Everyone sees exactly what they owe
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom CTA - Only show for anonymous users */}
            {!currentUser && (
              <div className="max-w-3xl mx-auto pt-8 pb-16">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-3">
                    Ready to get started?
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                    Create an event or join one in seconds
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setShowStartEventModal(true);
                        setTimeout(() => eventNameRef.current?.focus(), 0);
                      } else {
                        setShowRegisterRequiredModal(true);
                      }
                    }}
                    className="w-full sm:w-auto px-8 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
                  >
                    Start Event
                  </button>
                  <button
                    onClick={() => {
                      setShowJoinEventModal(true);
                      setTimeout(() => joinCodeRef.current?.focus(), 0);
                    }}
                    className="w-full sm:w-auto px-8 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded transition-colors"
                  >
                    Join Event
                  </button>
                </div>
              </div>
            )}

            {/* My Events List - Only show for logged-in users */}
            {currentUser && isLoadingEvents ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  My Events
                </h2>
                <div className="space-y-2">
                  {/* Loading skeleton */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg animate-pulse">
                      <div className="h-5 bg-slate-300 dark:bg-slate-600 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-650 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : currentUser && myEvents.length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  My Events
                </h2>
                <div className="space-y-2">
                  {myEvents.map((event) => (
                    <button
                      key={event!.id}
                      onClick={() => openEvent(event!.id)}
                      className="w-full text-left p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                            {event!.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {event!.userRole === 'host' ? (
                              <>Host Code: {event!.hostCode}</>
                            ) : (
                              <>Guest Code: {event!.guestCode}</>
                            )} · {event!.userRole === 'host' ? 'Host' : 'Guest'}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Event View */
          <>
            {/* Total */}
            <div className={`rounded-lg shadow-md mb-4 sm:mb-6 transition-colors ${
              totalBill > 0 && totalOwed === 0
                ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-700'
                : 'bg-white dark:bg-slate-800'
            }`}>
              {/* Main Total */}
              <div className="flex flex-col items-center p-4 sm:p-6">
                <span className={`text-sm sm:text-base font-medium mb-1 ${
                  totalBill > 0 && totalOwed === 0
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}>
                  Restaurant Bill Total
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl sm:text-4xl font-bold ${
                    totalBill > 0 && totalOwed === 0
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    £{totalBill.toFixed(2)}
                  </span>
                  {totalBill > 0 && totalOwed === 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Deposits and Owed - Separate sections */}
              {totalBill > 0 && (
                <div className={`grid grid-cols-2 gap-0 border-t-2 ${
                  totalBill > 0 && totalOwed === 0
                    ? 'border-green-200 dark:border-green-700'
                    : 'border-slate-200 dark:border-slate-700'
                }`}>
                  {/* Deposits Section */}
                  <div className="flex flex-col items-center p-3 sm:p-4 border-r-2 border-slate-200 dark:border-slate-700">
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Deposits
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200">
                      £{totalDeposits.toFixed(2)}
                    </span>
                  </div>

                  {/* Still Owed Section */}
                  <div className="flex flex-col items-center p-3 sm:p-4">
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Still Owed
                    </span>
                    <span className={`text-lg sm:text-xl font-bold ${
                      totalOwed === 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      £{totalOwed.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Add Guest Form - Host Only */}
            {userRole === 'host' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="Guest name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                    className="flex-1 px-4 py-3 sm:py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                  <input
                    type="number"
                    placeholder="Total bill"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                    step="0.01"
                    className="w-full sm:w-32 px-4 py-3 sm:py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <input
                    type="number"
                    placeholder="Deposit"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                    step="0.01"
                    className="w-full sm:w-28 px-4 py-3 sm:py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={addGuest}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Items Modal */}
            {showItemsModal && editingGuest && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full my-8">
                  <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-slate-800 pb-2 -mt-6 pt-6 z-10">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                      {editingGuest.name}
                    </h2>
                    <button
                      onClick={closeItemsModal}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-4">
                    {editingGuest.items.length > 0 && (
                      <div className="mb-3 space-y-2 max-h-60 overflow-y-auto">
                        {editingGuest.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded"
                          >
                            <span className="text-slate-700 dark:text-slate-200">
                              {item.note}
                            </span>
                            <button
                              onClick={() => removeItem(editingGuest.id, item.id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                              aria-label="Remove item"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        ref={itemNoteRef}
                        type="text"
                        placeholder="Add item (e.g., Starter, Fish and chips)"
                        value={itemNote}
                        onChange={(e) => setItemNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addItemToGuest();
                          if (e.key === 'Escape') {
                            setShowItemsModal(false);
                            setEditingGuestId(null);
                            setItemNote('');
                          }
                        }}
                        className="flex-1 px-4 py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      />
                      <button
                        onClick={addItemToGuest}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Pre-order / Notes
                    </label>
                    <textarea
                      value={editingGuest.notes}
                      onChange={(e) => {
                        setGuests(
                          guests.map((g) =>
                            g.id === editingGuest.id
                              ? { ...g, notes: e.target.value }
                              : g
                          )
                        );
                      }}
                      placeholder="e.g., Vegetarian option, no onions, extra fries..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 resize-none"
                    />
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                      {editingGuest.notes.length}/500
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Guest List */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3 sm:mb-4">
                Guests ({guests.length})
              </h2>

              {guests.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  {/* Icon */}
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                  </div>

                  {/* Main message */}
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    No guests yet
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mb-6 max-w-sm mx-auto">
                    Get started by adding your first guest using the form above
                  </p>

                  {/* Tips */}
                  <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-left">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Enter guest name and optionally their bill amount
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Click on guest names to add menu items and notes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">3</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {userRole === 'host' ? 'Mark guests as paid when they settle up' : 'Track who has paid and what they ordered'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {guests.map((guest) => (
                    <div
                      key={guest.id}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                        selectedGuestId === guest.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-700 border-transparent'
                      }`}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {userRole === 'host' && (
                            <button
                              onClick={() => togglePaid(guest.id)}
                              className={`flex-shrink-0 w-10 h-10 sm:w-8 sm:h-8 rounded border-2 transition-colors flex items-center justify-center ${
                                guest.paid
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-slate-300 dark:border-slate-600 hover:border-green-400'
                              }`}
                              aria-label="Mark as paid"
                            >
                              {guest.paid && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-6 h-6 sm:w-5 sm:h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => selectGuest(guest.id)}
                            className="flex-1 text-left min-w-0"
                          >
                            <span className={`font-medium text-xl sm:text-2xl break-words transition-colors ${
                              guest.paid
                                ? 'text-slate-400 dark:text-slate-500 line-through'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}>
                              {guest.name}
                            </span>
                          </button>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                          {editingAmountId === guest.id && userRole === 'host' ? (
                            <div
                              className="flex flex-col gap-2"
                              onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                  saveAmount();
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 dark:text-slate-400">Total bill:</span>
                                <input
                                  ref={editAmountRef}
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveAmount();
                                    if (e.key === 'Escape') cancelEditAmount();
                                  }}
                                  step="0.01"
                                  className="w-20 sm:w-24 px-2 py-1 text-sm sm:text-base font-semibold border-2 border-blue-500 rounded focus:outline-none dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 dark:text-slate-400">Deposit:</span>
                                <input
                                  type="number"
                                  value={editDeposit}
                                  onChange={(e) => setEditDeposit(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveAmount();
                                    if (e.key === 'Escape') cancelEditAmount();
                                  }}
                                  step="0.01"
                                  className="w-20 sm:w-24 px-2 py-1 text-sm sm:text-base font-semibold border-2 border-blue-500 rounded focus:outline-none dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                startEditingAmount(guest.id, guest.amount, guest.deposit)
                              }
                              className="flex flex-col items-end"
                              disabled={userRole !== 'host'}
                            >
                              <span className={`text-xl sm:text-2xl font-semibold ${userRole === 'host' ? 'text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400' : 'text-slate-700 dark:text-slate-200'} transition-colors`}>
                                £{(guest.amount - guest.deposit).toFixed(2)}
                              </span>
                              {guest.deposit > 0 && (
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  £{guest.amount.toFixed(2)} - £{guest.deposit.toFixed(2)} deposit
                                </span>
                              )}
                            </button>
                          )}
                          {userRole === 'host' && (
                            <button
                              onClick={() => removeGuest(guest.id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                              aria-label="Remove guest"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bank Details - Bottom Section */}
            <div className="mt-6 mb-4 space-y-2">
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <button
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Payment Details
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${showBankDetails ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {showBankDetails && (
                  <>
                    <div className="flex items-center justify-end gap-2 mb-2">
                      {userRole === 'host' && (
                        <button
                          onClick={openBankDetailsModal}
                          className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
                          aria-label="Edit bank details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const bankDetails = `Bank Details for Payment:\n\nAccount Number: ${currentEvent?.bankAccountNumber || 'Not set'}\nSort Code: ${currentEvent?.bankSortCode || 'Not set'}\nAccount Name: ${currentEvent?.bankAccountName || 'Not set'}`;
                          navigator.clipboard.writeText(bankDetails);
                          showToastNotification('All bank details copied!');
                        }}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded transition-colors"
                      >
                        Copy All
                      </button>
                    </div>

                    <div className="space-y-2">
                  {/* Account Number */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Account Number
                      </div>
                      <div className="font-mono text-sm text-slate-700 dark:text-slate-200 tracking-wide">
                        {currentEvent?.bankAccountNumber || 'Not set'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentEvent?.bankAccountNumber || '');
                        showToastNotification('Account number copied!');
                      }}
                      className="ml-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Sort Code */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Sort Code
                      </div>
                      <div className="font-mono text-sm text-slate-700 dark:text-slate-200 tracking-wide">
                        {currentEvent?.bankSortCode || 'Not set'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentEvent?.bankSortCode || '');
                        showToastNotification('Sort code copied!');
                      }}
                      className="ml-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Account Name */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Account Name
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-200 break-words">
                        {currentEvent?.bankAccountName || 'Not set'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentEvent?.bankAccountName || '');
                        showToastNotification('Account name copied!');
                      }}
                      className="ml-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded transition-colors flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Event Codes - Footer Section */}
            <div className="mt-6 mb-4 space-y-2">
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <button
                  onClick={() => setShowEventCodes(!showEventCodes)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Event Codes
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${showEventCodes ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {showEventCodes && (
                  <div className="space-y-2">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            Guest Code
                          </div>
                          <div className="font-mono text-sm text-slate-700 dark:text-slate-200 tracking-wide">
                            {currentEvent.guestCode}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentEvent.guestCode);
                            showToastNotification('Guest code copied to clipboard.');
                          }}
                          className="ml-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      {userRole === 'host' && (
                        <button
                          onClick={() => copyGuestCode(currentEvent.guestCode)}
                          className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                          </svg>
                          Copy text to share on WhatsApp or messaging
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {userRole === 'host' && (
                <button
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete Event
                </button>
              )}
            </div>
          </>
        )}

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-[100]">
            <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl flex items-center gap-2 sm:gap-3 w-full sm:min-w-[280px] sm:max-w-md border-2 border-green-400/20">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm sm:text-base font-medium flex-1">{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
