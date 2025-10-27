'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  createEvent as apiCreateEvent,
  joinEvent as apiJoinEvent,
  getMyEvents as apiGetMyEvents,
  updateBankDetails as apiUpdateBankDetails,
  leaveEvent as apiLeaveEvent,
  updateEventSettings as apiUpdateEventSettings,
  deleteEvent as apiDeleteEvent,
  getGuests as apiGetGuests,
  addGuest as apiAddGuest,
  updateGuest as apiUpdateGuest,
  deleteGuest as apiDeleteGuest,
  addGuestItem as apiAddGuestItem,
  deleteGuestItem as apiDeleteGuestItem,
  claimGuest as apiClaimGuest,
  unclaimGuest as apiUnclaimGuest,
  getMyClaimedGuest as apiGetMyClaimedGuest,
  register as apiRegister,
  login as apiLogin,
  getCurrentUser,
  forgotPassword as apiForgotPassword
} from '@/lib/api-client';

interface Item {
  id: string;
  note: string;
  price?: number | null;
}

interface Guest {
  id: string;
  name: string;
  amount: number;
  deposit: number;
  items: Item[];
  notes: string;
  paid: boolean;
  app_user_id?: number | null;
}

interface Event {
  id: string;
  name: string;
  guestCode: string;
  guests: Guest[];
  createdAt: number;
  paymentMethod?: 'venue' | 'bank_transfer';
  bankAccountNumber?: string;
  bankSortCode?: string;
  bankAccountName?: string;
  allowGuestPriceEdit?: boolean;
  allowGuestNotesEdit?: boolean;
  hostContactInfo?: string;
}

interface UserEventMembership {
  eventId: string;
  role: 'host' | 'guest';
  joinedAt: number;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Event system state
  const [events, setEvents] = useState<Event[]>([]);
  const [userMemberships, setUserMemberships] = useState<UserEventMembership[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'host' | 'guest' | null>(null);

  // Guest management state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [itemNote, setItemNote] = useState('');
  const [itemPrice, setItemPrice] = useState<string>('');
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
  const [pendingGuestCode, setPendingGuestCode] = useState<string | null>(null); // Code from URL to join after registration
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isNavigatingToProfile, setIsNavigatingToProfile] = useState(false);

  // Event settings state
  const [showEventSettings, setShowEventSettings] = useState(false);
  const [settingsEventName, setSettingsEventName] = useState('');
  const [settingsPaymentMethod, setSettingsPaymentMethod] = useState<'venue' | 'bank_transfer'>('venue');
  const [settingsBankAccountNumber, setSettingsBankAccountNumber] = useState('');
  const [settingsBankSortCode, setSettingsBankSortCode] = useState('');
  const [settingsBankAccountName, setSettingsBankAccountName] = useState('');
  const [settingsAllowGuestNotesEdit, setSettingsAllowGuestNotesEdit] = useState(true);
  const [settingsHostContactInfo, setSettingsHostContactInfo] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Contact host modal state
  const [showContactHostModal, setShowContactHostModal] = useState(false);

  // Calculator modal state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('');
  const [calculatorField, setCalculatorField] = useState<'amount' | 'deposit' | null>(null);
  const [calculatorGuestId, setCalculatorGuestId] = useState<string | null>(null);
  const [isFirstInput, setIsFirstInput] = useState(true);

  // Claim guest modal state
  const [showClaimGuestModal, setShowClaimGuestModal] = useState(false);
  const [selectedClaimGuestId, setSelectedClaimGuestId] = useState<string | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null); // Event waiting for claim
  const [isClaimingGuest, setIsClaimingGuest] = useState(false);
  const [isEditingGuestName, setIsEditingGuestName] = useState(false);
  const [editedGuestName, setEditedGuestName] = useState('');
  const [isCreatingNewGuest, setIsCreatingNewGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');

  // Payment details modal state
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);

  // Guest details page state
  const [viewingGuestId, setViewingGuestId] = useState<string | null>(null);
  const [showingBreakdown, setShowingBreakdown] = useState(false);
  const [showingNotesSummary, setShowingNotesSummary] = useState(false);

  // Guest notes modal state
  const [editingGuestNotesId, setEditingGuestNotesId] = useState<string | null>(null);
  const [tempGuestNotes, setTempGuestNotes] = useState('');

  // Menu state
  const [showMenu, setShowMenu] = useState(false);

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
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [editBankSortCode, setEditBankSortCode] = useState('');
  const [editBankAccountName, setEditBankAccountName] = useState('');

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
  const loadGuestsForEvent = useCallback(async (eventId: string): Promise<Guest[]> => {
    const result = await apiGetGuests(parseInt(eventId));

    if (!result.success) {
      // Show error to user with toast notification
      showToastNotification(result.error || 'Failed to load guests');
      return [];
    }

    // Convert API guests to local format
    const convertedApiGuests: Guest[] = result.guests!.map(apiGuest => ({
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
      app_user_id: apiGuest.app_user_id
    }));

    // Update event with API guests
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, guests: convertedApiGuests } : e
    ));

    // Update guests state for current event
    setGuests(convertedApiGuests);

    return convertedApiGuests;
  }, []);

  // Load current user on mount
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Detect session expiry from URL and show notification
  useEffect(() => {
    const sessionExpired = searchParams.get('sessionExpired');

    if (sessionExpired === 'true') {
      showToastNotification('Your session has expired. Please login again.');
      // Clear the URL parameter without triggering a reload
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('sessionExpired');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);

  // Detect guest code from URL on mount
  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      setPendingGuestCode(code);

      // If user is logged in, auto-open join modal
      if (currentUser) {
        setJoinCode(code);
        setShowJoinEventModal(true);
      }
    }
  }, [currentUser, searchParams]);

  // Detect event from URL and open it
  useEffect(() => {
    const eventIdFromUrl = searchParams.get('event');

    if (eventIdFromUrl && currentUser && events.length > 0) {
      // Only set state if it's different from current (avoid infinite loop)
      if (eventIdFromUrl !== currentEventId) {
        const event = events.find(e => e.id === eventIdFromUrl);
        if (event) {
          const membership = userMemberships.find(m => m.eventId === eventIdFromUrl);
          if (membership) {
            // Load guests and set state
            loadGuestsForEvent(eventIdFromUrl).then(loadedGuests => {
              setGuests(loadedGuests);
              setCurrentEventId(eventIdFromUrl);
              setUserRole(membership.role);
            });
          }
        }
      }
    } else if (!eventIdFromUrl && currentEventId) {
      // URL doesn't have event param but we have one open - close it
      setCurrentEventId(null);
      setUserRole(null);
      setGuests([]);
    }
  }, [searchParams, currentUser, events, userMemberships, currentEventId, loadGuestsForEvent]);

  // Load events and memberships from API when user logs in
  useEffect(() => {
    const loadEvents = async () => {
      // Only load events if user is logged in
      if (!currentUser) {
        return;
      }

      try {
        const apiEvents = await apiGetMyEvents();

        // Convert API events to local format
        const convertedApiEvents: Event[] = apiEvents.map(apiEvent => ({
          id: apiEvent.id.toString(),
          name: apiEvent.name,
          guestCode: apiEvent.guest_code,
          guests: [], // Will be loaded when user opens the event
          createdAt: new Date(apiEvent.created_at).getTime(),
          paymentMethod: apiEvent.payment_method as 'venue' | 'bank_transfer' | undefined,
          bankAccountNumber: apiEvent.bank_account_number,
          bankSortCode: apiEvent.bank_sort_code,
          bankAccountName: apiEvent.bank_account_name,
          allowGuestPriceEdit: apiEvent.allow_guest_price_edit ?? false,
          allowGuestNotesEdit: apiEvent.allow_guest_notes_edit ?? true,
          hostContactInfo: apiEvent.host_contact_info,
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
      }
    };

    loadEvents();
  }, [currentUser]);

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

        // TEMP: Disabled redirect to test original
        // router.push('/events');
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

        // TEMP: Disabled redirect to test original
        // router.push('/events');
      } else {
        setAuthError(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Register error:', error);
      setAuthError('An error occurred during registration');
    }
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
  // const openBankDetailsModal = () => {
  //   const currentEvent = events.find(e => e.id === currentEventId);
  //   if (currentEvent) {
  //     setEditBankAccountNumber(currentEvent.bankAccountNumber || '');
  //     setEditBankSortCode(currentEvent.bankSortCode || '');
  //     setEditBankAccountName(currentEvent.bankAccountName || '');
  //   } else {
  //     setEditBankAccountNumber('');
  //     setEditBankSortCode('');
  //     setEditBankAccountName('');
  //   }
  //   setShowBankDetailsModal(true);
  // };

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

  // Claim guest functions
  const openClaimGuestModal = () => {
    setSelectedClaimGuestId(null);
    setShowClaimGuestModal(true);
  };

  const handleClaimGuest = async () => {
    const eventId = pendingEventId || currentEventId;
    if (!selectedClaimGuestId || !eventId) return;

    setIsClaimingGuest(true);
    try {
      const result = await apiClaimGuest(parseInt(eventId), parseInt(selectedClaimGuestId));

      if (result.success) {
        setShowClaimGuestModal(false);
        setSelectedClaimGuestId(null);

        // If this was a pending event (first-time join), open it now
        if (pendingEventId) {
          setPendingEventId(null);
          setCurrentEventId(eventId);
          setUserRole('guest');
        }

        // Reload guests to reflect the claim
        await loadGuestsForEvent(eventId);
      }
    } catch (error) {
      console.error('Error claiming guest:', error);
    } finally {
      setIsClaimingGuest(false);
    }
  };

  const handleUnclaimGuest = async () => {
    if (!currentEventId) return;

    try {
      const result = await apiUnclaimGuest(parseInt(currentEventId));

      if (result.success) {
        // Reload guests to reflect the unclaim
        await loadGuestsForEvent(currentEventId);
      }
    } catch (error) {
      console.error('Error unclaiming guest:', error);
    }
  };

  const handleCancelClaimModal = async () => {
    // If closing during pending join, leave the event and delete placeholder
    if (pendingEventId) {
      try {
        await apiLeaveEvent(parseInt(pendingEventId));
        // Remove event from events list
        setEvents(events.filter(e => e.id !== pendingEventId));
        console.log('Left event and deleted placeholder');
      } catch (error) {
        console.error('Error leaving event:', error);
      }
      setPendingEventId(null);
      router.push('/');
    }
    setShowClaimGuestModal(false);
    setIsCreatingNewGuest(false);
    setNewGuestName('');
    setSelectedClaimGuestId(null);
  };

  const handleAddAndClaimNewGuest = async () => {
    const eventId = pendingEventId || currentEventId;
    if (!newGuestName.trim() || !eventId) return;

    setIsClaimingGuest(true);
    try {
      // Check if an unclaimed guest with this name already exists (case-insensitive)
      const unclaimedGuests = guests.filter(g => !g.app_user_id && g.name !== '');
      const existingGuest = unclaimedGuests.find(g =>
        g.name.trim().toLowerCase() === newGuestName.trim().toLowerCase()
      );

      if (existingGuest) {
        // Claim the existing unclaimed guest instead of creating a duplicate
        await apiClaimGuest(parseInt(eventId), parseInt(existingGuest.id));
      } else {
        // No existing guest with this name - proceed with create/update
        // Try to get the user's placeholder guest (empty name)
        const myGuestResult = await apiGetMyClaimedGuest(parseInt(eventId));

        if (myGuestResult.success && myGuestResult.guest) {
          // Placeholder exists - update it with the new name
          await apiUpdateGuest(
            myGuestResult.guest.id,
            { name: newGuestName.trim() }
          );
        } else {
          // No placeholder - create a new guest and claim it
          const newGuest = await apiAddGuest(
            parseInt(eventId),
            newGuestName.trim(),
            0,
            0
          );

          // Claim the newly created guest
          await apiClaimGuest(parseInt(eventId), newGuest.id);
        }
      }

      setShowClaimGuestModal(false);
      setNewGuestName('');
      setIsCreatingNewGuest(false);

      // If this was a pending event (first-time join), open it now
      if (pendingEventId) {
        setPendingEventId(null);
        setCurrentEventId(eventId);
        setUserRole('guest');
      }

      // Reload guests to reflect the update
      await loadGuestsForEvent(eventId);
    } catch (error) {
      console.error('Error adding and claiming guest:', error);
    } finally {
      setIsClaimingGuest(false);
    }
  };

  // Event functions
  const startNewEvent = async () => {
    if (eventName.trim() && !isCreatingEvent) {
      setIsCreatingEvent(true);
      try {
        // Try API first (hybrid approach)
        const apiEvent = await apiCreateEvent(eventName.trim());

        // Convert API event to local format
        const newEvent: Event = {
          id: apiEvent.id.toString(),
          name: apiEvent.name,
          guestCode: apiEvent.guest_code,
          guests: [],
          createdAt: new Date(apiEvent.created_at).getTime(),
          paymentMethod: apiEvent.payment_method as 'venue' | 'bank_transfer' | undefined,
          bankAccountNumber: apiEvent.bank_account_number,
          bankSortCode: apiEvent.bank_sort_code,
          bankAccountName: apiEvent.bank_account_name,
          allowGuestPriceEdit: apiEvent.allow_guest_price_edit ?? false,
          allowGuestNotesEdit: apiEvent.allow_guest_notes_edit ?? true,
          hostContactInfo: apiEvent.host_contact_info,
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
      } finally {
        setIsCreatingEvent(false);
      }
    }
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
        guestCode: apiEvent.guest_code,
        guests: [],
        createdAt: new Date(apiEvent.created_at).getTime(),
        paymentMethod: apiEvent.payment_method as 'venue' | 'bank_transfer' | undefined,
        bankAccountNumber: apiEvent.bank_account_number,
        bankSortCode: apiEvent.bank_sort_code,
        bankAccountName: apiEvent.bank_account_name,
        allowGuestPriceEdit: apiEvent.allow_guest_price_edit ?? false,
        allowGuestNotesEdit: apiEvent.allow_guest_notes_edit ?? true,
        hostContactInfo: apiEvent.host_contact_info,
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

      setJoinCode('');
      setJoinCodeError('');
      setShowJoinEventModal(false);

      // Load guests first (needed for modal to show unclaimed list)
      // For pending joins, we'll load guests WITHOUT setting currentEventId
      // This way the modal can show the list but user isn't "in" the event yet
      let loadedGuests: Guest[] = [];
      try {
        loadedGuests = await loadGuestsForEvent(newEvent.id);
        setGuests(loadedGuests);
      } catch (error) {
        console.log('Could not load guests (user may not be member yet):', error);
        // If loading fails, we'll show an empty list in the modal
        setGuests([]);
      }

      // Check if user needs to claim a guest profile
      const myClaimedGuestResult = await apiGetMyClaimedGuest(parseInt(newEvent.id));

      // Get fresh user data
      const freshUser = getCurrentUser();

      // User needs to claim if they're a guest AND either:
      // 1. They have no guest at all (shouldn't happen with placeholder system)
      // 2. They have a placeholder guest (name is empty)
      const needsToClaim = apiEvent.role === 'guest' &&
                          myClaimedGuestResult.success &&
                          (!myClaimedGuestResult.guest || myClaimedGuestResult.guest.name === '');

      if (needsToClaim) {
        // Check for case-insensitive name match in unclaimed guests
        const unclaimedGuests = loadedGuests.filter(g => !g.app_user_id && g.name !== '');
        const userToMatch = freshUser || currentUser;
        const exactMatch = userToMatch ? unclaimedGuests.find(g =>
          g.name.trim().toLowerCase() === userToMatch.name.trim().toLowerCase()
        ) : null;

        if (exactMatch) {
          // Auto-claim the matching guest
          try {
            const claimResult = await apiClaimGuest(parseInt(newEvent.id), parseInt(exactMatch.id));

            if (claimResult.success) {
              // Successfully claimed, open event
              setCurrentEventId(newEvent.id);
              setUserRole('guest');
              await loadGuestsForEvent(newEvent.id);
            } else {
              // Claim failed, show modal
              setPendingEventId(newEvent.id);
              setShowClaimGuestModal(true);
            }
          } catch (error) {
            console.error('Error auto-claiming:', error);
            // On error, show modal
            setPendingEventId(newEvent.id);
            setShowClaimGuestModal(true);
          }
        } else {
          // No exact match - show claim modal
          setPendingEventId(newEvent.id);
          setShowClaimGuestModal(true);
        }
      } else {
        // User already claimed or is host - open event immediately
        setCurrentEventId(newEvent.id);
        setUserRole(apiEvent.role);
      }
    } else {
      // API failed - show appropriate error message
      if (result.return_code === 'EVENT_NOT_FOUND') {
        setJoinCodeError('Invalid code');
      } else {
        setJoinCodeError('Failed to join event. Please check your connection.');
      }
    }
  };

  const leaveEventAsGuest = async () => {
    if (!currentEventId || userRole !== 'guest') return;

    try {
      // Call API to remove membership
      await apiLeaveEvent(parseInt(currentEventId));

      // Remove event from local state
      setEvents(events.filter(e => e.id !== currentEventId));
      setUserMemberships(userMemberships.filter(m => m.eventId !== currentEventId));

      // Navigate back to home - URL change will trigger state cleanup
      router.push('/');

      showToastNotification('Left event successfully');
    } catch (error) {
      console.error('Error leaving event:', error);
      showToastNotification('Failed to leave event');
    }
  };

  // const leaveEvent = () => {
  //   setCurrentEventId(null);
  //   setUserRole(null);
  //   setGuests([]);
  // };

  const confirmDeleteEvent = async () => {
    if (!currentEventId || userRole !== 'host') return;

    try {
      // Call API to delete event from database
      await apiDeleteEvent(parseInt(currentEventId));

      // Remove event from UI state
      setEvents(events.filter(e => e.id !== currentEventId));
      // Remove all memberships for this event
      setUserMemberships(userMemberships.filter(m => m.eventId !== currentEventId));
      // Navigate back to home - URL change will trigger state cleanup
      router.push('/');
      setShowDeleteConfirmModal(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      showToastNotification('Failed to delete event. Please try again.');
      setShowDeleteConfirmModal(false);
    }
  };

  const openEventSettings = () => {
    if (!currentEventId) return;
    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    // Pre-fill settings with current values
    setSettingsEventName(event.name);
    setSettingsPaymentMethod(event.paymentMethod || 'venue');
    setSettingsBankAccountNumber(event.bankAccountNumber || '');
    setSettingsBankSortCode(event.bankSortCode || '');
    setSettingsBankAccountName(event.bankAccountName || '');
    setSettingsAllowGuestNotesEdit(event.allowGuestNotesEdit !== false);
    setSettingsHostContactInfo(event.hostContactInfo || '');
    setShowEventSettings(true);
  };

  const closeEventSettings = () => {
    setShowEventSettings(false);
  };

  const saveEventSettings = async () => {
    if (!currentEventId || isSavingSettings) return;

    setIsSavingSettings(true);
    try {
      const updatedEvent = await apiUpdateEventSettings(parseInt(currentEventId), {
        event_name: settingsEventName,
        payment_method: settingsPaymentMethod,
        bank_account_number: settingsBankAccountNumber,
        bank_sort_code: settingsBankSortCode,
        bank_account_name: settingsBankAccountName,
        allow_guest_notes_edit: settingsAllowGuestNotesEdit,
        host_contact_info: settingsHostContactInfo,
      });

      // Update local state
      setEvents(events.map(e =>
        e.id === currentEventId
          ? {
              ...e,
              name: updatedEvent.name,
              paymentMethod: updatedEvent.payment_method as 'venue' | 'bank_transfer' | undefined,
              bankAccountNumber: updatedEvent.bank_account_number,
              bankSortCode: updatedEvent.bank_sort_code,
              bankAccountName: updatedEvent.bank_account_name,
              allowGuestNotesEdit: updatedEvent.allow_guest_notes_edit,
              hostContactInfo: updatedEvent.host_contact_info,
            }
          : e
      ));

      setShowEventSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      // Error state shown in UI, no toast
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Guest functions
  const addGuest = async () => {
    if (!name.trim() || !currentEventId) return;

    const guestName = name.trim();

    try {
      // Add guest with only name, amount and deposit default to 0
      const apiGuest = await apiAddGuest(
        parseInt(currentEventId),
        guestName,
        0, // amount defaults to 0
        0  // deposit defaults to 0
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

  // const selectGuest = (id: string) => {
  //   setEditingGuestId(id);
  //   setShowItemsModal(true);
  //   setTimeout(() => itemNoteRef.current?.focus(), 0);
  // };

  const addItemToGuest = async () => {
    if (!editingGuestId || !itemNote.trim()) return;

    const noteText = itemNote.trim();
    const priceValue = itemPrice.trim() ? parseFloat(itemPrice) : undefined;

    try {
      // Try API first (hybrid approach)
      const apiItem = await apiAddGuestItem(parseInt(editingGuestId), noteText, priceValue);

      // Convert API item to local format and update state
      const newItem = {
        id: apiItem.id.toString(),
        note: apiItem.note,
        price: apiItem.price
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
      setItemPrice('');
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

  // Calculator modal functions
  const openCalculator = (field: 'amount' | 'deposit', guestId: string, currentValue: number) => {
    setCalculatorField(field);
    setCalculatorGuestId(guestId);
    setCalculatorValue(currentValue === 0 ? '' : currentValue.toString());
    setIsFirstInput(true);
    setShowCalculator(true);
  };

  const handleCalculatorNumberPress = (num: string) => {
    if (isFirstInput) {
      setCalculatorValue(num);
      setIsFirstInput(false);
    } else {
      // Prevent multiple decimal points
      if (num === '.' && calculatorValue.includes('.')) return;
      setCalculatorValue(calculatorValue + num);
    }
  };

  const handleCalculatorBackspace = () => {
    if (calculatorValue.length > 0) {
      setCalculatorValue(calculatorValue.slice(0, -1));
      setIsFirstInput(false);
    }
  };

  const handleCalculatorOK = async () => {
    if (!calculatorGuestId || !calculatorField) return;

    const numValue = calculatorValue === '' ? 0 : parseFloat(calculatorValue);

    if (calculatorField === 'amount') {
      setGuests(guests.map(g =>
        g.id === calculatorGuestId ? { ...g, amount: isNaN(numValue) ? 0 : numValue } : g
      ));
      try {
        await apiUpdateGuest(parseInt(calculatorGuestId), { amount: isNaN(numValue) ? 0 : numValue });
      } catch (error) {
        console.error('Error updating guest:', error);
      }
    } else if (calculatorField === 'deposit') {
      setGuests(guests.map(g =>
        g.id === calculatorGuestId ? { ...g, deposit: isNaN(numValue) ? 0 : numValue } : g
      ));
      try {
        await apiUpdateGuest(parseInt(calculatorGuestId), { deposit: isNaN(numValue) ? 0 : numValue });
      } catch (error) {
        console.error('Error updating guest:', error);
      }
    }

    setShowCalculator(false);
    setCalculatorValue('');
    setCalculatorField(null);
    setCalculatorGuestId(null);
  };

  const handleCalculatorCancel = () => {
    setShowCalculator(false);
    setCalculatorValue('');
    setCalculatorField(null);
    setCalculatorGuestId(null);
  };

  // const startEditingAmount = (guestId: string, currentAmount: number, currentDeposit: number) => {
  //   if (userRole === 'host') {
  //     setEditingAmountId(guestId);
  //     setEditAmount(currentAmount.toString());
  //     setEditDeposit(currentDeposit.toString());
  //     setTimeout(() => editAmountRef.current?.select(), 0);
  //   }
  // };

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

  // Filter out placeholder guests (empty names) for bill calculations
  const realGuests = guests.filter(g => g.name !== '');
  const totalBill = realGuests.reduce((sum, guest) => sum + guest.amount, 0);
  const totalOwed = realGuests.reduce((sum, guest) => {
    if (!guest.paid) {
      return sum + guest.amount;
    }
    return sum;
  }, 0);
  const editingGuest = guests.find((g) => g.id === editingGuestId);
  const currentEvent = events.find((e) => e.id === currentEventId);

  // Show settings screen if open
  if (showEventSettings && currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Settings Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={closeEventSettings}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Event Settings</h1>
            <div className="w-16"></div>
          </div>

          {/* Settings Form */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 space-y-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Event Name
              </label>
              <input
                type="text"
                value={settingsEventName}
                onChange={(e) => setSettingsEventName(e.target.value)}
                className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                placeholder="e.g., Pizza Express - Oct 11"
              />
            </div>

            {/* Guest Code (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Guest Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentEvent.guestCode}
                  readOnly
                  className="flex-1 px-4 py-3 text-base font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentEvent.guestCode);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Share this code with guests to let them join the event
              </p>
            </div>

            {/* Payment Details Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Payment Details</h3>

              {/* Payment Method Selector */}
              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-colors" style={{
                  borderColor: settingsPaymentMethod === 'venue' ? '#3b82f6' : '#e2e8f0',
                  backgroundColor: settingsPaymentMethod === 'venue' ? '#eff6ff' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="venue"
                    checked={settingsPaymentMethod === 'venue'}
                    onChange={(e) => setSettingsPaymentMethod(e.target.value as 'venue' | 'bank_transfer')}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-100">Pay at venue/till</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Guests pay their share at the venue</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg transition-colors" style={{
                  borderColor: settingsPaymentMethod === 'bank_transfer' ? '#3b82f6' : '#e2e8f0',
                  backgroundColor: settingsPaymentMethod === 'bank_transfer' ? '#eff6ff' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={settingsPaymentMethod === 'bank_transfer'}
                    onChange={(e) => setSettingsPaymentMethod(e.target.value as 'venue' | 'bank_transfer')}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-100">Bank transfer</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Guests transfer to your bank account</div>
                  </div>
                </label>
              </div>

              {/* Bank Fields - Only shown when bank_transfer is selected */}
              {settingsPaymentMethod === 'bank_transfer' && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={settingsBankAccountNumber}
                      onChange={(e) => setSettingsBankAccountNumber(e.target.value)}
                      className="w-full px-4 py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      placeholder="12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Sort Code
                    </label>
                    <input
                      type="text"
                      value={settingsBankSortCode}
                      onChange={(e) => setSettingsBankSortCode(e.target.value)}
                      className="w-full px-4 py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      placeholder="04-00-03"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={settingsBankAccountName}
                      onChange={(e) => setSettingsBankAccountName(e.target.value)}
                      className="w-full px-4 py-2 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Guest Permissions Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Guest Permissions</h3>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={settingsAllowGuestNotesEdit}
                  onChange={(e) => setSettingsAllowGuestNotesEdit(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-800 dark:text-slate-200">Allow guests to edit their pre-order notes</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Guests can add or modify their own notes and pre-orders</div>
                </div>
              </label>
            </div>

            {/* Host Contact Info Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Host Contact Info (Optional)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Share your preferred contact method with guests (phone, email, WhatsApp, etc.)
              </p>
              <textarea
                value={settingsHostContactInfo}
                onChange={(e) => setSettingsHostContactInfo(e.target.value)}
                placeholder="e.g., Call/text: 07123 456789 or email: host@example.com"
                maxLength={200}
                rows={3}
                className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 resize-none"
              />
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-right">
                {settingsHostContactInfo.length}/200
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={saveEventSettings}
                disabled={isSavingSettings || !settingsEventName.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isSavingSettings ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Danger Zone - Delete Event */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Once you delete an event, there is no going back. All guest data and payment information will be permanently deleted.
              </p>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(true);
                  setShowEventSettings(false);
                }}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete Event Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header - Only show on home page */}
        {!currentEvent && (
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-100">
              SplitDine
            </h1>

            <div>
              {currentUser ? (
                <button
                  onClick={() => {
                    setIsNavigatingToProfile(true);
                    router.push('/profile');
                  }}
                  disabled={isNavigatingToProfile}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isNavigatingToProfile ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    'Profile'
                  )}
                </button>
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
              )}
            </div>
          </div>
        )}

        {/* New Bill + Modal */}
        {showStartEventModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Create new event and bill
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
                  disabled={isCreatingEvent}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingEvent ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'OK'
                  )}
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
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Create Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Free to use • No credit card required
              </p>

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
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Create a Free Account
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                No credit card required
              </p>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                To create or join events, please register for a free account. This allows you to access your events from any device and ensures you never lose your data.
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
                  Delete Event Bill?
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
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    openEventSettings();
                  }}
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
            {/* Join Event Banner - Show for anonymous users with pending code */}
            {!currentUser && pendingGuestCode && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-center sm:text-left">
                    <h3 className="text-base font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Join this event
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Register or log in to join event with code: <span className="font-mono font-semibold">{pendingGuestCode}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRegisterRequiredModal(true)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            )}

            {/* My Events Quick Access - Show for logged-in users */}
            {currentUser && (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-center sm:text-left">
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-1">
                      Welcome back, {currentUser.name}!
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Manage your group dining events
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/events')}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    View My Events
                  </button>
                </div>
              </div>
            )}

            {/* Hero Section - Two Column Layout with Overlap */}
            <div className="max-w-7xl mx-auto pt-8 pb-12 px-4 relative">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column - Text Content */}
                <div className="text-center lg:text-left space-y-6 lg:pr-8">
                  <div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-50 mb-4 tracking-tight leading-tight">
                      Split the bill <span className="text-blue-600 dark:text-blue-400 text-5xl sm:text-6xl lg:text-7xl">in seconds</span>
                      <span className="block text-2xl sm:text-3xl font-normal text-slate-500 dark:text-slate-400 mt-2">— not 30 minutes</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                      Your group dining control centre — track RSVPs, collect deposits, manage what everyone owes, and settle up fast.
                    </p>
                  </div>
                </div>

                {/* Right Column - Angled Phone Mockup */}
                <div className="hidden lg:block absolute right-0 top-8 w-[45%]">
                  <div className="relative transform lg:rotate-[-4deg] lg:translate-x-8">
                    {/* Phone with lighter outline frame */}
                    <div className="relative w-[320px] xl:w-[380px] border-4 border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
                      <Image
                        src="/Hero-1.jpg"
                        alt="SplitDine app showing bill split between guests"
                        width={380}
                        height={760}
                        className="w-full h-auto rounded-[2rem]"
                      />
                    </div>
                    {/* Floating badge */}
                    <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-xl">
                      See who&apos;s paid ✓
                    </div>
                  </div>
                </div>

                {/* Mobile Phone View - Center aligned */}
                <div className="lg:hidden flex justify-center mt-8">
                  <div className="relative w-[300px]">
                    <div className="border-4 border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
                      <Image
                        src="/Hero-1.jpg"
                        alt="SplitDine app showing bill split between guests"
                        width={300}
                        height={600}
                        className="w-full h-auto rounded-[2rem]"
                      />
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-xl">
                      See who&apos;s paid ✓
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons - Full Width Section */}
              <div className="max-w-7xl mx-auto px-4 mt-8">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setShowStartEventModal(true);
                        setTimeout(() => eventNameRef.current?.focus(), 0);
                      } else {
                        setShowRegisterRequiredModal(true);
                      }
                    }}
                    className="w-full sm:w-auto px-12 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-lg font-semibold rounded-lg transition-colors shadow-lg"
                  >
                    Start a Group Bill
                  </button>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setShowJoinEventModal(true);
                        setTimeout(() => joinCodeRef.current?.focus(), 0);
                      } else {
                        setShowRegisterRequiredModal(true);
                      }
                    }}
                    className="w-full sm:w-auto px-12 py-4 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-lg font-semibold rounded-lg transition-colors"
                  >
                    Join an Event
                  </button>
                </div>

                {/* Free Badge */}
                {!currentUser && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
                    <span className="inline-flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full text-sm text-green-700 dark:text-green-400 font-semibold">
                      Currently Free
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      No credit card required
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* All-in-One Tool Section */}
            <div className="max-w-4xl mx-auto pt-12 pb-4">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                  All-in-One Tool for Group Meals
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  SplitDine isn&apos;t just for paying the bill — it&apos;s a complete group dining management platform that helps you stay in control from start to finish.
                </p>
              </div>

              {/* Feature List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Collect deposits before the meal</h3>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Track who&apos;s coming and who&apos;s paid</h3>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Let guests enter their share in advance</h3>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">See live totals before the bill arrives</h3>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 md:col-span-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Pay once and leave without the 30-minute chaos</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Pain / Value Section - Always visible for SEO */}
            <div className="max-w-4xl mx-auto pt-12 pb-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
                  <h2 className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-4">
                    The worst part of group meals? Settling the bill.
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light mb-6 leading-relaxed">
                    When 8–10 people eat together, settling up can take 20–30 minutes — staff reprint receipts, people argue over who had what, and someone always overpays.
                    <br /><br />
                    <strong className="text-slate-700 dark:text-slate-300">SplitDine fixes it all:</strong>
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">✓</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-light">Guests know what they owe before the bill even arrives</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">✓</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-light">You know who&apos;s paid and who hasn&apos;t in real time</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">✓</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-light">One clean total means you can settle in seconds, not half an hour</span>
                    </li>
                  </ul>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    ✅ Result: No waiting. No confusion. No stress.
                  </p>
                </div>
            </div>

            {/* How It Works Section - Always visible for SEO */}
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
                      Create your event
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                      Set up your group meal in minutes — add the date, restaurant, and any details guests need. You can also optionally include your bank details or payment link if you want to collect money directly.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <span className="text-lg font-medium text-slate-700 dark:text-slate-300">2</span>
                    </div>
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-2">
                      Guests enter their share
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                      Each guest selects what they ordered or enters the amount they owe. Live totals update automatically, so everyone knows the balance before the bill arrives.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <span className="text-lg font-medium text-slate-700 dark:text-slate-300">3</span>
                    </div>
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-2">
                      Settle up quickly
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                      With totals calculated in advance, you can either settle the bill in one payment or provide the restaurant with a clear breakdown of names and balances for individual card payments — no 30-minute chaos at the till.
                    </p>
                  </div>
                  </div>
                </div>
            </div>

            {/* Use Cases Section - Always visible for SEO */}
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

            {/* Feature Showcase - Always visible for SEO */}
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

            {/* Features Section - Always visible for SEO */}
            <div className="max-w-4xl mx-auto pt-8 pb-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
                  <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-10">
                    Everything You Need to Manage a Group Meal
                  </h2>

                  {/* For Hosts */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
                      For Hosts — Total Control Over the Bill
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Know exactly what everyone owes – real-time tracking of guest contributions</span>
                      </li>
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Optional payment collection – share bank details or a payment link, or skip it entirely</span>
                      </li>
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Collect deposits easily – secure commitment before the meal</span>
                      </li>
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Live bill overview – total owed, payments received, and outstanding balances</span>
                      </li>
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Faster bill settlement – no more 20-30 minute delays</span>
                      </li>
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Event tracking made simple – see confirmations and payment status at a glance</span>
                      </li>
                    </ul>
                  </div>

                  {/* For Guests */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
                      For Guests — Easy, Fair, and Transparent
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">•</span>
                        <span>Pay only for what you ordered – no more splitting evenly when you didn&apos;t have dessert</span>
                      </li>
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">•</span>
                        <span>Clear instructions – guests know how much to pay and when</span>
                      </li>
                      <li className="flex items-start text-sm text-slate-600 dark:text-slate-400 font-light">
                        <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">•</span>
                        <span>Walk out when you&apos;re ready – no mental maths, no awkward conversations</span>
                      </li>
                    </ul>
                  </div>
                </div>
            </div>

            {/* Bottom CTA - Always visible for SEO */}
            <div className="max-w-3xl mx-auto pt-8 pb-16">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-3">
                    Make your next group meal stress-free
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light">
                    Create your first event today and skip the 30-minute chaos at the end of dinner.
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
                    Start a Group Bill
                  </button>
                  <button
                    onClick={() => {
                      if (currentUser) {
                        setShowJoinEventModal(true);
                        setTimeout(() => joinCodeRef.current?.focus(), 0);
                      } else {
                        setShowRegisterRequiredModal(true);
                      }
                    }}
                    className="w-full sm:w-auto px-8 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded transition-colors"
                  >
                    Join an Event
                  </button>
                </div>
            </div>
          </div>
        ) : (
          /* Event View */
          <>
            {/* Header with Back Button, Event Name, and Menu */}
            <div className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 mb-6">
              {/* Top row: Back, Event Name, Menu */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                {/* Back Button */}
                <button
                  onClick={() => {
                    if (showingNotesSummary) {
                      // If viewing notes summary, go back to event page
                      setShowingNotesSummary(false);
                    } else if (showingBreakdown) {
                      // If viewing breakdown, go back to guest detail
                      setShowingBreakdown(false);
                    } else if (viewingGuestId) {
                      // If viewing a guest, go back to event page
                      setViewingGuestId(null);
                    } else {
                      // If on event page, go back to events list
                      router.push('/');
                      setShowMenu(false);
                    }
                  }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-600 dark:text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                </button>

                {/* Event Name */}
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200 truncate px-3 flex-1 text-center">
                  {currentEvent?.name || 'Event'}
                </h1>

                {/* Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label="Menu"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-600 dark:text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <>
                      {/* Backdrop for click outside */}
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
                      {/* Payment Details */}
                      <button
                        onClick={() => {
                          setShowPaymentDetailsModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                        <span className="text-sm font-medium">Payment Details</span>
                      </button>

                      {/* Notes Summary */}
                      <button
                        onClick={() => {
                          setShowingNotesSummary(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        <span className="text-sm font-medium">Notes Summary</span>
                      </button>

                      {/* My Guest Name (for guests with claimed profiles) */}
                      {guests.length > 0 && (
                        <button
                          onClick={() => {
                            openClaimGuestModal();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-3"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          <span className="text-sm font-medium">My Guest Name</span>
                        </button>
                      )}

                      {/* Contact Host (for guests) */}
                      {userRole === 'guest' && (
                        <button
                          onClick={() => {
                            setShowContactHostModal(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-3"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                          <span className="text-sm font-medium">Contact Host</span>
                        </button>
                      )}

                      {/* Settings (host only) */}
                      {userRole === 'host' && (
                        <button
                          onClick={() => {
                            openEventSettings();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-3"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm font-medium">Settings</span>
                        </button>
                      )}

                      {/* Leave Event (guest only) */}
                      {userRole === 'guest' && (
                        <button
                          onClick={() => {
                            leaveEventAsGuest();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 mt-2 pt-3"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                          </svg>
                          <span className="text-sm font-medium">Leave Event</span>
                        </button>
                      )}
                    </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bill Total Section - Only show when not viewing a guest's detail page */}
              {!viewingGuestId && (
                <div className={`px-4 py-3 border-t transition-all duration-300 ${
                  totalBill > 0 && totalOwed === 0
                    ? 'bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20 border-green-300 dark:border-green-700'
                    : 'border-slate-200 dark:border-slate-800'
                }`}>
                  {/* Total */}
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-sm font-medium ${
                      totalBill > 0 && totalOwed === 0
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {totalBill > 0 && totalOwed === 0 ? '✓ Fully Paid!' : 'Bill Total:'}
                    </span>
                    <span className={`font-bold text-2xl ${
                      totalBill > 0 && totalOwed === 0
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}>
                      £{totalBill.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {showingNotesSummary ? (
              /* Notes Summary Page */
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Notes Summary</h2>

                  {/* Host Quick Toggle */}
                  {userRole === 'host' && (
                    <button
                      onClick={async () => {
                        if (!currentEventId) return;
                        const newValue = !currentEvent?.allowGuestNotesEdit;

                        try {
                          await apiUpdateEventSettings(parseInt(currentEventId), {
                            allow_guest_notes_edit: newValue,
                          });

                          // Update local state
                          setEvents(events.map(e =>
                            e.id === currentEventId
                              ? { ...e, allowGuestNotesEdit: newValue }
                              : e
                          ));
                        } catch (error) {
                          console.error('Error toggling guest notes edit:', error);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-700 dark:text-slate-300 min-h-12"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                        {currentEvent?.allowGuestNotesEdit !== false ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        )}
                      </svg>
                      <span className="whitespace-nowrap">{currentEvent?.allowGuestNotesEdit !== false ? 'Lock Editing' : 'Unlock Editing'}</span>
                    </button>
                  )}
                </div>

                {/* Host Contact Info */}
                {currentEvent?.hostContactInfo && currentEvent.hostContactInfo.trim() && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Host Contact</h3>
                        <div className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap break-words">
                          {(() => {
                            const text = currentEvent.hostContactInfo;
                            // Linkify phone numbers, emails, and URLs
                            const phoneRegex = /(\+?[\d\s()-]{10,})/g;
                            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
                            const urlRegex = /(https?:\/\/[^\s]+)/g;

                            let result: (string | React.ReactElement)[] = [text];

                            // Process URLs
                            result = result.flatMap(part => {
                              if (typeof part !== 'string') return part;
                              const parts: (string | React.ReactElement)[] = [];
                              let lastIndex = 0;
                              const matches = Array.from(part.matchAll(urlRegex));
                              matches.forEach((match, i) => {
                                if (match.index !== undefined) {
                                  if (match.index > lastIndex) {
                                    parts.push(part.substring(lastIndex, match.index));
                                  }
                                  parts.push(
                                    <a key={`url-${i}`} href={match[0]} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-200">
                                      {match[0]}
                                    </a>
                                  );
                                  lastIndex = match.index + match[0].length;
                                }
                              });
                              if (lastIndex < part.length) {
                                parts.push(part.substring(lastIndex));
                              }
                              return parts.length > 0 ? parts : [part];
                            });

                            // Process emails
                            result = result.flatMap(part => {
                              if (typeof part !== 'string') return part;
                              const parts: (string | React.ReactElement)[] = [];
                              let lastIndex = 0;
                              const matches = Array.from(part.matchAll(emailRegex));
                              matches.forEach((match, i) => {
                                if (match.index !== undefined) {
                                  if (match.index > lastIndex) {
                                    parts.push(part.substring(lastIndex, match.index));
                                  }
                                  parts.push(
                                    <a key={`email-${i}`} href={`mailto:${match[0]}`} className="underline hover:text-blue-600 dark:hover:text-blue-200">
                                      {match[0]}
                                    </a>
                                  );
                                  lastIndex = match.index + match[0].length;
                                }
                              });
                              if (lastIndex < part.length) {
                                parts.push(part.substring(lastIndex));
                              }
                              return parts.length > 0 ? parts : [part];
                            });

                            // Process phone numbers
                            result = result.flatMap(part => {
                              if (typeof part !== 'string') return part;
                              const parts: (string | React.ReactElement)[] = [];
                              let lastIndex = 0;
                              const matches = Array.from(part.matchAll(phoneRegex));
                              matches.forEach((match, i) => {
                                if (match.index !== undefined) {
                                  if (match.index > lastIndex) {
                                    parts.push(part.substring(lastIndex, match.index));
                                  }
                                  const cleaned = match[0].replace(/[\s()-]/g, '');
                                  if (cleaned.length >= 10) {
                                    parts.push(
                                      <a key={`phone-${i}`} href={`tel:${cleaned}`} className="underline hover:text-blue-600 dark:hover:text-blue-200">
                                        {match[0]}
                                      </a>
                                    );
                                  } else {
                                    parts.push(match[0]);
                                  }
                                  lastIndex = match.index + match[0].length;
                                }
                              });
                              if (lastIndex < part.length) {
                                parts.push(part.substring(lastIndex));
                              }
                              return parts.length > 0 ? parts : [part];
                            });

                            return result;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Banner for Guests when locked */}
                {userRole !== 'host' && currentEvent?.allowGuestNotesEdit === false && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Note editing is currently locked by the host. Please contact your host if you need to make changes to your pre-order.
                    </p>
                  </div>
                )}

                {guests.length > 0 ? (
                  <div className="space-y-2">
                    {guests.sort((a, b) => a.name.localeCompare(b.name)).map((guest) => {
                      const canEdit = userRole === 'host' || (guest.app_user_id === currentUser?.id && currentEvent?.allowGuestNotesEdit !== false);

                      return (
                        <div
                          key={guest.id}
                          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                              {guest.name}
                            </h3>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setTempGuestNotes(guest.notes);
                                  setEditingGuestNotesId(guest.id);
                                }}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0 min-w-12 min-h-12 flex items-center justify-center"
                                aria-label="Edit notes"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-600 dark:text-slate-400">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {guest.notes && guest.notes.trim() && (
                            <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">
                              {guest.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">No guests yet</p>
                  </div>
                )}
              </div>
            ) : viewingGuestId ? (
              /* Guest Details, Breakdown, or Notes Page */
              (() => {
                const viewingGuest = guests.find(g => g.id === viewingGuestId);
                if (!viewingGuest) return null;

                if (showingBreakdown) {
                  /* Bill Breakdown Page */
                  return (
                    <>
                      {/* Guest Name */}
                      <div className="mb-6">
                        <h2 className="text-xl sm:text-2xl font-light text-slate-600 dark:text-slate-400 text-center">
                          {viewingGuest.name}
                        </h2>
                      </div>

                      {/* Sticky Top Input Field - Add Item */}
                      {userRole === 'host' && (
                        <div className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm mb-6">
                          <div className="px-3 sm:px-4 py-3">
                            <div className="flex gap-1.5 sm:gap-2">
                              <input
                                type="text"
                                placeholder="Item name"
                                value={itemNote}
                                onChange={(e) => setItemNote(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    document.getElementById('sticky-top-item-price-input')?.focus();
                                  }
                                }}
                                className="flex-1 min-w-0 px-2 sm:px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                              />
                              <input
                                id="sticky-top-item-price-input"
                                type="number"
                                placeholder="£0.00"
                                value={itemPrice}
                                onChange={(e) => setItemPrice(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    if (!itemNote.trim() || !viewingGuestId) return;

                                    const noteText = itemNote.trim();
                                    const priceValue = itemPrice.trim() ? parseFloat(itemPrice) : undefined;

                                    try {
                                      const apiItem = await apiAddGuestItem(parseInt(viewingGuestId), noteText, priceValue);

                                      const newItem = {
                                        id: apiItem.id.toString(),
                                        note: apiItem.note,
                                        price: apiItem.price
                                      };

                                      setGuests(
                                        guests.map((guest) =>
                                          guest.id === viewingGuestId
                                            ? {
                                                ...guest,
                                                items: [newItem, ...guest.items],
                                              }
                                            : guest
                                        )
                                      );
                                      setItemNote('');
                                      setItemPrice('');
                                      // Focus back on the item name field
                                      setTimeout(() => {
                                        const itemNameInput = document.querySelector('input[placeholder="Item name"]') as HTMLInputElement;
                                        itemNameInput?.focus();
                                      }, 0);
                                    } catch (error) {
                                      console.error('Error adding item:', error);
                                    }
                                  }
                                }}
                                step="0.01"
                                className="w-16 sm:w-24 px-2 sm:px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={async () => {
                                  if (!itemNote.trim() || !viewingGuestId) return;

                                  const noteText = itemNote.trim();
                                  const priceValue = itemPrice.trim() ? parseFloat(itemPrice) : undefined;

                                  try {
                                    const apiItem = await apiAddGuestItem(parseInt(viewingGuestId), noteText, priceValue);

                                    const newItem = {
                                      id: apiItem.id.toString(),
                                      note: apiItem.note,
                                      price: apiItem.price
                                    };

                                    setGuests(
                                      guests.map((guest) =>
                                        guest.id === viewingGuestId
                                          ? {
                                              ...guest,
                                              items: [newItem, ...guest.items],
                                            }
                                          : guest
                                      )
                                    );
                                    setItemNote('');
                                    setItemPrice('');
                                    // Focus back on the item name field
                                    setTimeout(() => {
                                      const itemNameInput = document.querySelector('input[placeholder="Item name"]') as HTMLInputElement;
                                      itemNameInput?.focus();
                                    }, 0);
                                  } catch (error) {
                                    console.error('Error adding item:', error);
                                  }
                                }}
                                disabled={!itemNote.trim()}
                                className="px-2.5 sm:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Item Breakdown Section */}
                      <div className="space-y-6 pb-6">
                        {/* Items List */}
                        <div className="space-y-3">
                          {viewingGuest.items.length > 0 ? (
                            viewingGuest.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between px-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex-1">
                                  <span className="text-base font-medium text-slate-800 dark:text-slate-100">
                                    {item.note}
                                  </span>
                                  {item.price !== null && item.price !== undefined && (
                                    <div className="mt-1">
                                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        £{item.price.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {userRole === 'host' && (
                                  <button
                                    onClick={() => removeItem(viewingGuest.id, item.id)}
                                    className="ml-3 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    aria-label="Remove item"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <p className="text-slate-500 dark:text-slate-400 text-sm">No items yet</p>
                            </div>
                          )}
                        </div>

                        {/* Summary Section */}
                        {viewingGuest.items.length > 0 && (() => {
                          const itemsTotal = viewingGuest.items.reduce((sum, item) => {
                            return sum + (item.price || 0);
                          }, 0);
                          const difference = itemsTotal - viewingGuest.amount;

                          return (
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Items Subtotal
                                </span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  £{itemsTotal.toFixed(2)}
                                </span>
                              </div>
                              {Math.abs(difference) > 0.01 ? (
                                <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-200 dark:border-slate-700">
                                  <span className="text-red-600 dark:text-red-400">
                                    {difference < 0 ? 'Missing' : 'Extra'}
                                  </span>
                                  <span className="font-medium text-red-600 dark:text-red-400">
                                    {difference < 0 ? '-' : ''}£{Math.abs(difference).toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-200 dark:border-slate-700">
                                  <span className="text-green-600 dark:text-green-400">
                                    Matches
                                  </span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    ✓
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-slate-800 rounded-lg">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  Bill Total
                                </span>
                                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                  £{viewingGuest.amount.toFixed(2)}
                                </span>
                              </div>
                              {userRole === 'host' && itemsTotal > 0 && Math.abs(difference) > 0.01 && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await apiUpdateGuest(parseInt(viewingGuestId), { amount: itemsTotal });
                                      setGuests(
                                        guests.map((g) =>
                                          g.id === viewingGuestId
                                            ? { ...g, amount: itemsTotal }
                                            : g
                                        )
                                      );
                                    } catch (error) {
                                      console.error('Error updating bill total:', error);
                                    }
                                  }}
                                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                  </svg>
                                  Set bill total to £{itemsTotal.toFixed(2)}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  );
                }

                /* Guest Details Page */
                return (
                  <>
                    {/* Guest Name */}
                    <div className="mb-4">
                      <h2 className="text-xl sm:text-2xl font-light text-slate-600 dark:text-slate-400 text-center">
                        {viewingGuest.name}
                      </h2>
                    </div>

                    {/* Bill Overview */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
                      <div className="space-y-4">
                        {/* Balance - Prominent Display */}
                        <div>
                          <div className="flex flex-col items-center px-3 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Balance
                            </span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              £{(viewingGuest.amount - viewingGuest.deposit).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Total and Deposit - Side by Side */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 grid grid-cols-2 gap-4">
                          {/* Total */}
                          <div className="text-center">
                            <label className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                              Total
                            </label>
                            <div
                              onClick={() => userRole === 'host' && openCalculator('amount', viewingGuestId, viewingGuest.amount)}
                              className={`w-full px-4 py-4 text-xl font-semibold rounded-lg text-slate-800 dark:text-slate-100 ${
                                userRole === 'host'
                                  ? 'bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                  : 'bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              £{viewingGuest.amount.toFixed(2)}
                              {userRole === 'host' && (
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">tap to edit</div>
                              )}
                            </div>
                          </div>

                          {/* Deposit */}
                          <div className="text-center">
                            <label className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                              Deposit
                            </label>
                            <div
                              onClick={() => userRole === 'host' && openCalculator('deposit', viewingGuestId, viewingGuest.deposit)}
                              className={`w-full px-4 py-4 text-xl font-semibold rounded-lg text-slate-800 dark:text-slate-100 ${
                                userRole === 'host'
                                  ? 'bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                  : 'bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              £{viewingGuest.deposit.toFixed(2)}
                              {userRole === 'host' && (
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">tap to edit</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowingBreakdown(true)}
                        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-600 rounded-lg py-4 px-6 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        Bill Breakdown
                      </button>

                      <button
                        onClick={() => {
                          setTempGuestNotes(viewingGuest.notes);
                          setEditingGuestNotesId(viewingGuestId);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-600 rounded-lg py-4 px-6 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Pre-order / Notes
                      </button>
                    </div>
                  </>
                );
              })()
            ) : (
              /* Event Dashboard */
              <>
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
              {guests.filter(g => g.name !== '').length === 0 ? (
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
                  <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-sm mx-auto">
                    Get started by adding your first guest
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {guests.filter(g => g.name !== '').map((guest) => (
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
                            onClick={() => setViewingGuestId(guest.id)}
                            className="flex-1 text-left min-w-0"
                          >
                            <span className={`font-medium text-xl sm:text-2xl break-words transition-colors ${
                              guest.paid
                                ? 'text-slate-400 dark:text-slate-500 line-through'
                                : guest.app_user_id === currentUser?.id
                                  ? 'text-blue-600 dark:text-blue-400'
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
                              onClick={() => setViewingGuestId(guest.id)}
                              className="flex flex-col items-end"
                            >
                              <span className={`text-xl sm:text-2xl font-semibold transition-colors ${
                                guest.app_user_id === currentUser?.id
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'
                              }`}>
                                £{(guest.amount - guest.deposit).toFixed(2)}
                              </span>
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


            {/* Add Guest - Host Only */}
            {userRole === 'host' && (
              <div className="mt-4 sm:mt-6">
                <p className="text-red-600 font-bold text-lg mb-2">TEST: Layout updated - button should be below on mobile</p>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="Guest name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addGuest();
                    }}
                    className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                  <button
                    onClick={addGuest}
                    disabled={!name.trim()}
                    className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  e.g., Sarah, John&apos;s friend, Person from accounting - can be claimed and changed by the guest
                </p>
              </div>
            )}
          </>
        )}
          </>
        )}

        {/* Calculator Modal */}
        {showCalculator && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleCalculatorCancel}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {calculatorField === 'amount' ? 'Bill Total' : 'Paid'}
                  </h3>
                  <button
                    onClick={handleCalculatorCancel}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-500 dark:text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Display */}
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-right text-3xl font-semibold text-slate-800 dark:text-slate-100">
                    £{calculatorValue || '0'}
                  </div>
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleCalculatorNumberPress(num)}
                      className="p-4 text-xl font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleCalculatorBackspace}
                    className="p-4 text-xl font-semibold bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center justify-center"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleCalculatorNumberPress('0')}
                    className="p-4 text-xl font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-colors"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleCalculatorNumberPress('.')}
                    className="p-4 text-xl font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition-colors"
                  >
                    .
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCalculatorCancel}
                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCalculatorOK}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details Modal */}
        {showPaymentDetailsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPaymentDetailsModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Payment Details</h3>
                  <button
                    onClick={() => setShowPaymentDetailsModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-500 dark:text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {currentEvent?.paymentMethod === 'bank_transfer' ? (
                  /* Bank Transfer */
                  <>
                    <div className="space-y-4">
                      {/* Account Number */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            Account Number
                          </div>
                          <div className="font-mono text-base text-slate-800 dark:text-slate-200 tracking-wide">
                            {currentEvent?.bankAccountNumber || 'Not set'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentEvent?.bankAccountNumber || '');
                            showToastNotification('Account number copied!');
                          }}
                          className="ml-3 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 text-sm rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>

                      {/* Sort Code */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            Sort Code
                          </div>
                          <div className="font-mono text-base text-slate-800 dark:text-slate-200 tracking-wide">
                            {currentEvent?.bankSortCode || 'Not set'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentEvent?.bankSortCode || '');
                            showToastNotification('Sort code copied!');
                          }}
                          className="ml-3 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 text-sm rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>

                      {/* Account Name */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            Account Name
                          </div>
                          <div className="text-base text-slate-800 dark:text-slate-200 break-words">
                            {currentEvent?.bankAccountName || 'Not set'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentEvent?.bankAccountName || '');
                            showToastNotification('Account name copied!');
                          }}
                          className="ml-3 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 text-sm rounded transition-colors flex-shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Copy All Button */}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => {
                          const bankDetails = `Bank Details for Payment:\n\nAccount Number: ${currentEvent?.bankAccountNumber || 'Not set'}\nSort Code: ${currentEvent?.bankSortCode || 'Not set'}\nAccount Name: ${currentEvent?.bankAccountName || 'Not set'}`;
                          navigator.clipboard.writeText(bankDetails);
                          showToastNotification('All bank details copied!');
                        }}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Copy All Details
                      </button>
                    </div>
                  </>
                ) : (
                  /* Venue Payment */
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600 dark:text-blue-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Pay at venue
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">
                      Guests should pay their share at the venue till when settling the bill
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guest Notes Modal */}
        {editingGuestNotesId && (() => {
          const guest = guests.find(g => g.id === editingGuestNotesId);
          if (!guest) return null;

          const isHost = userRole === 'host';
          const isOwnGuest = guest.app_user_id === currentUser?.id;
          const canEditNotes = isHost || (isOwnGuest && currentEvent?.allowGuestNotesEdit !== false);

          return (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => {
                setEditingGuestNotesId(null);
                setTempGuestNotes('');
              }}
            >
              <div
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      Pre-order / Notes
                    </h3>
                    <button
                      onClick={() => {
                        setEditingGuestNotesId(null);
                        setTempGuestNotes('');
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-500 dark:text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Guest Name */}
                  <div className="mb-4">
                    <p className="text-base font-medium text-slate-600 dark:text-slate-400">
                      {guest.name}
                    </p>
                  </div>

                  {/* Locked Message for Guests */}
                  {!canEditNotes && !isHost && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Note editing is currently locked by the host. Please contact your host if you need to make changes.
                      </p>
                    </div>
                  )}

                  {/* Notes Textarea */}
                  <div className="mb-2">
                    <textarea
                      value={tempGuestNotes}
                      onChange={(e) => setTempGuestNotes(e.target.value)}
                      placeholder="e.g., Vegetarian option, no onions..."
                      maxLength={500}
                      rows={8}
                      readOnly={!canEditNotes}
                      autoFocus
                      className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 resize-none"
                    />
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-right">
                      {tempGuestNotes.length}/500
                    </div>
                  </div>

                  {/* Buttons */}
                  {canEditNotes && (
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          setEditingGuestNotesId(null);
                          setTempGuestNotes('');
                        }}
                        className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await apiUpdateGuest(
                              parseInt(editingGuestNotesId),
                              {
                                notes: tempGuestNotes,
                              }
                            );
                            // Update local state
                            setGuests(guests.map(g =>
                              g.id === editingGuestNotesId ? { ...g, notes: tempGuestNotes } : g
                            ));
                            setEditingGuestNotesId(null);
                            setTempGuestNotes('');
                          } catch (error) {
                            console.error('Error updating guest notes:', error);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Contact Host Modal */}
        {showContactHostModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowContactHostModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Contact Host
                  </h3>
                  <button
                    onClick={() => setShowContactHostModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-500 dark:text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {currentEvent?.hostContactInfo && currentEvent.hostContactInfo.trim() ? (
                  <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                    {(() => {
                      const text = currentEvent.hostContactInfo;
                      // Linkify phone numbers, emails, and URLs
                      const phoneRegex = /(\+?[\d\s()-]{10,})/g;
                      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
                      const urlRegex = /(https?:\/\/[^\s]+)/g;

                      let result: (string | React.ReactElement)[] = [text];

                      // Process URLs
                      result = result.flatMap(part => {
                        if (typeof part !== 'string') return part;
                        const parts: (string | React.ReactElement)[] = [];
                        let lastIndex = 0;
                        const matches = Array.from(part.matchAll(urlRegex));
                        matches.forEach((match, i) => {
                          if (match.index !== undefined) {
                            if (match.index > lastIndex) {
                              parts.push(part.substring(lastIndex, match.index));
                            }
                            parts.push(
                              <a key={`url-${i}`} href={match[0]} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200">
                                {match[0]}
                              </a>
                            );
                            lastIndex = match.index + match[0].length;
                          }
                        });
                        if (lastIndex < part.length) {
                          parts.push(part.substring(lastIndex));
                        }
                        return parts.length > 0 ? parts : [part];
                      });

                      // Process emails
                      result = result.flatMap(part => {
                        if (typeof part !== 'string') return part;
                        const parts: (string | React.ReactElement)[] = [];
                        let lastIndex = 0;
                        const matches = Array.from(part.matchAll(emailRegex));
                        matches.forEach((match, i) => {
                          if (match.index !== undefined) {
                            if (match.index > lastIndex) {
                              parts.push(part.substring(lastIndex, match.index));
                            }
                            parts.push(
                              <a key={`email-${i}`} href={`mailto:${match[0]}`} className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200">
                                {match[0]}
                              </a>
                            );
                            lastIndex = match.index + match[0].length;
                          }
                        });
                        if (lastIndex < part.length) {
                          parts.push(part.substring(lastIndex));
                        }
                        return parts.length > 0 ? parts : [part];
                      });

                      // Process phone numbers
                      result = result.flatMap(part => {
                        if (typeof part !== 'string') return part;
                        const parts: (string | React.ReactElement)[] = [];
                        let lastIndex = 0;
                        const matches = Array.from(part.matchAll(phoneRegex));
                        matches.forEach((match, i) => {
                          if (match.index !== undefined) {
                            if (match.index > lastIndex) {
                              parts.push(part.substring(lastIndex, match.index));
                            }
                            const cleaned = match[0].replace(/[\s()-]/g, '');
                            if (cleaned.length >= 10) {
                              parts.push(
                                <a key={`phone-${i}`} href={`tel:${cleaned}`} className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200">
                                  {match[0]}
                                </a>
                              );
                            } else {
                              parts.push(match[0]);
                            }
                            lastIndex = match.index + match[0].length;
                          }
                        });
                        if (lastIndex < part.length) {
                          parts.push(part.substring(lastIndex));
                        }
                        return parts.length > 0 ? parts : [part];
                      });

                      return result;
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Host has not provided contact information
                  </p>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowContactHostModal(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Claim Guest Modal */}
        {showClaimGuestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleCancelClaimModal}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                {(() => {
                  const myClaimedGuest = guests.find(g => g.app_user_id === currentUser?.id);
                  // Treat empty-name guests as unclaimed (placeholder)
                  const hasRealProfile = myClaimedGuest && myClaimedGuest.name !== '';

                  return (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          {hasRealProfile ? 'Your Profile' : 'Claim Guest Profile'}
                        </h3>
                        <button
                          onClick={handleCancelClaimModal}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                          aria-label="Close"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-500 dark:text-slate-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {(() => {
                  // Filter for truly unclaimed guests (no app_user_id) and exclude placeholders (empty names)
                  const unclaimedGuests = guests.filter(g => !g.app_user_id && g.name !== '');

                  // User has already claimed a real guest (not placeholder)
                  if (hasRealProfile) {
                    return (
                      <>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                          Your profile for this event:
                        </p>

                        <div className="p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
                          {isEditingGuestName ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={editedGuestName}
                                onChange={(e) => setEditedGuestName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                placeholder="Enter your name"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setIsEditingGuestName(false);
                                    setEditedGuestName('');
                                  }}
                                  className="flex-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!editedGuestName.trim()) return;
                                    try {
                                      await apiUpdateGuest(parseInt(myClaimedGuest.id), { name: editedGuestName.trim() });
                                      // Update local state
                                      setGuests(guests.map(g =>
                                        g.id === myClaimedGuest.id ? { ...g, name: editedGuestName.trim() } : g
                                      ));
                                      // Close modal and reset edit state
                                      setIsEditingGuestName(false);
                                      setEditedGuestName('');
                                      setShowClaimGuestModal(false);
                                    } catch (error) {
                                      console.error('Error updating guest name:', error);
                                    }
                                  }}
                                  disabled={!editedGuestName.trim()}
                                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-800 dark:text-slate-200 font-medium">
                                {myClaimedGuest.name}
                              </span>
                              <button
                                onClick={() => {
                                  setEditedGuestName(myClaimedGuest.name);
                                  setIsEditingGuestName(true);
                                }}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={async () => {
                            await handleUnclaimGuest();
                            setIsEditingGuestName(false);
                            setEditedGuestName('');
                          }}
                          className="w-full mt-1 py-2.5 text-xs text-slate-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        >
                          Unclaim this profile
                        </button>
                      </>
                    );
                  }

                  // No claimed guest - show unclaimed guests to claim
                  if (unclaimedGuests.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-slate-600 dark:text-slate-400">No unclaimed guests available.</p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">All guests have been claimed.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {!isCreatingNewGuest ? (
                        <>
                          <div className="mb-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {unclaimedGuests.length > 0
                                ? 'Select your name from the list, or add yourself if your name is not listed.'
                                : 'No unclaimed guests available. Add yourself to continue.'}
                            </p>
                            {unclaimedGuests.length > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                You can change the display name after claiming.
                              </p>
                            )}
                          </div>

                          {unclaimedGuests.length > 0 && (
                            <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1">
                              {unclaimedGuests.map((guest) => (
                                <label
                                  key={guest.id}
                                  className={`flex items-center justify-between gap-3 p-3.5 border-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedClaimGuestId === guest.id
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                  onClick={() => {
                                    setSelectedClaimGuestId(guest.id);
                                    setIsCreatingNewGuest(false);
                                  }}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <input
                                      type="radio"
                                      name="claimGuest"
                                      value={guest.id}
                                      checked={selectedClaimGuestId === guest.id && !isCreatingNewGuest}
                                      onChange={() => {}}
                                      className="w-4 h-4 text-blue-600 flex-shrink-0"
                                    />
                                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                                      {guest.name}
                                    </span>
                                  </div>
                                  <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                                    £{guest.amount.toFixed(2)}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setIsCreatingNewGuest(true);
                              setSelectedClaimGuestId(null);
                            }}
                            className="w-full mb-4 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                          >
                            + Add myself as a new guest
                          </button>

                          <div className="flex gap-3">
                            <button
                              onClick={handleCancelClaimModal}
                              className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleClaimGuest}
                              disabled={!selectedClaimGuestId || isClaimingGuest}
                              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                              OK
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Enter your name to create a new guest profile.
                          </p>

                          <input
                            type="text"
                            value={newGuestName}
                            onChange={(e) => setNewGuestName(e.target.value)}
                            placeholder="Your name"
                            className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 mb-6"
                            autoFocus
                          />

                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setIsCreatingNewGuest(false);
                                setNewGuestName('');
                              }}
                              className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                            >
                              Back
                            </button>
                            <button
                              onClick={handleAddAndClaimNewGuest}
                              disabled={!newGuestName.trim() || isClaimingGuest}
                              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                              OK
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  );
                      })()}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
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

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-slate-600 dark:text-slate-400">Loading...</div>
    </div>}>
      <HomeContent />
    </Suspense>
  );
}
