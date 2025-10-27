'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Event, Guest } from '@/lib/types';
import {
  getMyEvents as apiGetMyEvents,
  getGuests as apiGetGuests,
  updateGuest as apiUpdateGuest,
  addGuest as apiAddGuest,
  deleteGuest as apiDeleteGuest,
  addGuestItem as apiAddGuestItem,
  deleteGuestItem as apiDeleteGuestItem,
  updateEventSettings as apiUpdateEventSettings,
  claimGuest as apiClaimGuest,
  unclaimGuest as apiUnclaimGuest,
  getCurrentUser,
} from '@/lib/api-client';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  // Auth state
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string; name: string } | null>(null);

  // Event state
  const [event, setEvent] = useState<Event | null>(null);
  const [userRole, setUserRole] = useState<'host' | 'guest' | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  // Add guest state
  const [name, setName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Guest detail view state
  const [viewingGuestId, setViewingGuestId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Modal states
  const [showingBreakdown, setShowingBreakdown] = useState(false);
  const [editingGuestNotesId, setEditingGuestNotesId] = useState<string | null>(null);
  const [tempGuestNotes, setTempGuestNotes] = useState('');
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [showEventSettings, setShowEventSettings] = useState(false);

  // Claim guest modal state
  const [showClaimGuestModal, setShowClaimGuestModal] = useState(false);
  const [selectedClaimGuestId, setSelectedClaimGuestId] = useState<string | null>(null);
  const [isClaimingGuest, setIsClaimingGuest] = useState(false);
  const [isEditingGuestName, setIsEditingGuestName] = useState(false);
  const [editedGuestName, setEditedGuestName] = useState('');
  const [isCreatingNewGuest, setIsCreatingNewGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');

  // Settings state
  const [settingsEventName, setSettingsEventName] = useState('');
  const [settingsPaymentMethod, setSettingsPaymentMethod] = useState<'venue' | 'bank_transfer'>('venue');
  const [settingsBankAccountNumber, setSettingsBankAccountNumber] = useState('');
  const [settingsBankSortCode, setSettingsBankSortCode] = useState('');
  const [settingsBankAccountName, setSettingsBankAccountName] = useState('');
  const [settingsAllowGuestPriceEdit, setSettingsAllowGuestPriceEdit] = useState(false);
  const [settingsAllowGuestNotesEdit, setSettingsAllowGuestNotesEdit] = useState(true);
  const [settingsHostContactInfo, setSettingsHostContactInfo] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Notes summary modal state
  const [showNotesSummary, setShowNotesSummary] = useState(false);

  // Item management state
  const [itemNote, setItemNote] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  // Calculator modal state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('');
  const [calculatorField, setCalculatorField] = useState<'amount' | 'deposit' | null>(null);
  const [calculatorGuestId, setCalculatorGuestId] = useState<string | null>(null);
  const [isFirstInput, setIsFirstInput] = useState(true);

  // Deposits tracking state
  const [depositsPaid, setDepositsPaid] = useState(false);

  const togglePaid = async (guestId: string) => {
    if (userRole !== 'host') return;

    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;

    const newPaidStatus = !guest.paid;

    // Update local state first (immediate UI feedback)
    setGuests(
      guests.map((g) =>
        g.id === guestId
          ? { ...g, paid: newPaidStatus }
          : g
      )
    );

    // Sync with API
    try {
      await apiUpdateGuest(parseInt(guestId), { paid: newPaidStatus });
    } catch (error) {
      console.error('Error updating paid status:', error);
    }
  };

  const addGuest = async () => {
    if (!name.trim() || !eventId) return;

    const guestName = name.trim();

    try {
      // Add guest with only name, amount and deposit default to 0
      const apiGuest = await apiAddGuest(
        parseInt(eventId),
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
        items: apiGuest.items.map((item: import('@/lib/api-client').GuestItem) => ({
          id: item.id.toString(),
          note: item.note,
          price: item.price,
        })),
        notes: apiGuest.notes,
        paid: apiGuest.paid,
        app_user_id: apiGuest.app_user_id,
      };

      setGuests([...guests, newGuest]);
      setName('');
      nameInputRef.current?.focus();
    } catch (error) {
      console.error('Error adding guest via API:', error);
    }
  };

  const removeGuest = async (id: string) => {
    if (userRole !== 'host') return;

    // Delete from local state first (immediate UI feedback)
    setGuests(guests.filter((guest) => guest.id !== id));

    // Sync deletion with API
    try {
      await apiDeleteGuest(parseInt(id));
    } catch (error) {
      console.error('Error deleting guest from API:', error);
    }
  };

  // Calculator functions
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
      // Save old value for rollback
      const oldGuests = [...guests];

      // Optimistic update
      setGuests(guests.map(g =>
        g.id === calculatorGuestId ? { ...g, amount: isNaN(numValue) ? 0 : numValue } : g
      ));

      try {
        await apiUpdateGuest(parseInt(calculatorGuestId), { amount: isNaN(numValue) ? 0 : numValue });
      } catch (error) {
        // Revert optimistic update
        setGuests(oldGuests);

        // Show error to user
        const errorMsg = error instanceof Error ? error.message : 'Failed to update amount';
        setErrorMessage(errorMsg);
        setShowErrorModal(true);

        console.error('Error updating guest amount:', error);
        return; // Don't close calculator on error
      }
    } else if (calculatorField === 'deposit') {
      // Save old value for rollback
      const oldGuests = [...guests];

      // Optimistic update
      setGuests(guests.map(g =>
        g.id === calculatorGuestId ? { ...g, deposit: isNaN(numValue) ? 0 : numValue } : g
      ));

      try {
        await apiUpdateGuest(parseInt(calculatorGuestId), { deposit: isNaN(numValue) ? 0 : numValue });
      } catch (error) {
        // Revert optimistic update
        setGuests(oldGuests);

        // Show error to user
        const errorMsg = error instanceof Error ? error.message : 'Failed to update deposit';
        setErrorMessage(errorMsg);
        setShowErrorModal(true);

        console.error('Error updating guest deposit:', error);
        return; // Don't close calculator on error
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

  // Item management functions
  const addItemToGuest = async () => {
    if (!viewingGuestId || !itemNote.trim()) return;

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
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const removeItem = async (guestId: string, itemId: string) => {
    if (userRole !== 'host') return;

    // Remove from local state first (immediate UI feedback)
    setGuests(
      guests.map((guest) =>
        guest.id === guestId
          ? { ...guest, items: guest.items.filter((item) => item.id !== itemId) }
          : guest
      )
    );

    // Sync with API
    try {
      await apiDeleteGuestItem(parseInt(itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Settings functions
  const openEventSettings = () => {
    if (!event) return;

    // Pre-fill settings with current values
    setSettingsEventName(event.name);
    setSettingsPaymentMethod(event.paymentMethod || 'venue');
    setSettingsBankAccountNumber(event.bankAccountNumber || '');
    setSettingsBankSortCode(event.bankSortCode || '');
    setSettingsBankAccountName(event.bankAccountName || '');
    setSettingsAllowGuestPriceEdit(event.allowGuestPriceEdit ?? true); // Default to true if undefined
    setSettingsAllowGuestNotesEdit(event.allowGuestNotesEdit ?? true); // Default to true if undefined
    setSettingsHostContactInfo(event.hostContactInfo || '');
    setShowEventSettings(true);
  };

  const saveEventSettings = async () => {
    if (!eventId || isSavingSettings) return;

    setIsSavingSettings(true);
    try {
      const updatedEvent = await apiUpdateEventSettings(parseInt(eventId), {
        event_name: settingsEventName,
        payment_method: settingsPaymentMethod,
        bank_account_number: settingsBankAccountNumber,
        bank_sort_code: settingsBankSortCode,
        bank_account_name: settingsBankAccountName,
        allow_guest_price_edit: settingsAllowGuestPriceEdit,
        allow_guest_notes_edit: settingsAllowGuestNotesEdit,
        host_contact_info: settingsHostContactInfo,
      });

      // Update local state
      setEvent({
        ...event!,
        name: updatedEvent.name,
        paymentMethod: updatedEvent.payment_method as 'venue' | 'bank_transfer' | undefined,
        bankAccountNumber: updatedEvent.bank_account_number,
        bankSortCode: updatedEvent.bank_sort_code,
        bankAccountName: updatedEvent.bank_account_name,
        allowGuestPriceEdit: updatedEvent.allow_guest_price_edit,
        allowGuestNotesEdit: updatedEvent.allow_guest_notes_edit,
        hostContactInfo: updatedEvent.host_contact_info,
      });

      setShowEventSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Claim guest functions
  const openClaimGuestModal = () => {
    setSelectedClaimGuestId(null);
    setIsCreatingNewGuest(false);
    setNewGuestName('');
    setShowClaimGuestModal(true);
  };

  const handleClaimGuest = async () => {
    if (!selectedClaimGuestId || !eventId) return;

    setIsClaimingGuest(true);
    try {
      const result = await apiClaimGuest(parseInt(eventId), parseInt(selectedClaimGuestId));

      if (result.success) {
        setShowClaimGuestModal(false);
        setSelectedClaimGuestId(null);

        // Reload guests to reflect the claim
        const guestResult = await apiGetGuests(parseInt(eventId));
        if (guestResult.success && guestResult.guests) {
          const convertedGuests: Guest[] = guestResult.guests.map((g: import('@/lib/api-client').Guest) => ({
            id: g.id.toString(),
            name: g.name,
            amount: g.amount,
            deposit: g.deposit,
            items: g.items.map((item: import('@/lib/api-client').GuestItem) => ({
              id: item.id.toString(),
              note: item.note,
              price: item.price,
            })),
            notes: g.notes,
            paid: g.paid,
            app_user_id: g.app_user_id,
          }));
          setGuests(convertedGuests);
        }
      }
    } catch (error) {
      console.error('Error claiming guest:', error);
    } finally {
      setIsClaimingGuest(false);
    }
  };

  const handleUnclaimGuest = async () => {
    if (!eventId) return;

    try {
      const result = await apiUnclaimGuest(parseInt(eventId));

      if (result.success) {
        // Reload guests to reflect the unclaim
        const guestResult = await apiGetGuests(parseInt(eventId));
        if (guestResult.success && guestResult.guests) {
          const convertedGuests: Guest[] = guestResult.guests.map((g: import('@/lib/api-client').Guest) => ({
            id: g.id.toString(),
            name: g.name,
            amount: g.amount,
            deposit: g.deposit,
            items: g.items.map((item: import('@/lib/api-client').GuestItem) => ({
              id: item.id.toString(),
              note: item.note,
              price: item.price,
            })),
            notes: g.notes,
            paid: g.paid,
            app_user_id: g.app_user_id,
          }));
          setGuests(convertedGuests);
        }
      }
    } catch (error) {
      console.error('Error unclaiming guest:', error);
    }
  };

  const handleCancelClaimModal = () => {
    setShowClaimGuestModal(false);
    setSelectedClaimGuestId(null);
  };

  const handleAddAndClaimNewGuest = async () => {
    if (!newGuestName.trim() || !eventId) return;

    setIsClaimingGuest(true);
    try {
      // Check if an unclaimed guest with this name already exists (case-insensitive)
      const existingGuest = guests.find(
        g => g.name.toLowerCase() === newGuestName.trim().toLowerCase() && !g.app_user_id
      );

      if (existingGuest) {
        // Claim the existing guest
        const result = await apiClaimGuest(parseInt(eventId), parseInt(existingGuest.id));
        if (result.success) {
          setShowClaimGuestModal(false);
          setIsCreatingNewGuest(false);
          setNewGuestName('');

          // Reload guests
          const guestResult = await apiGetGuests(parseInt(eventId));
          if (guestResult.success && guestResult.guests) {
            const convertedGuests: Guest[] = guestResult.guests.map((g: import('@/lib/api-client').Guest) => ({
              id: g.id.toString(),
              name: g.name,
              amount: g.amount,
              deposit: g.deposit,
              items: g.items.map((item: import('@/lib/api-client').GuestItem) => ({
                id: item.id.toString(),
                note: item.note,
                price: item.price,
              })),
              notes: g.notes,
              paid: g.paid,
              app_user_id: g.app_user_id,
            }));
            setGuests(convertedGuests);
          }
        }
      } else {
        // Add new guest and claim
        const apiGuest = await apiAddGuest(parseInt(eventId), newGuestName.trim(), 0, 0);
        const result = await apiClaimGuest(parseInt(eventId), apiGuest.id);

        if (result.success) {
          setShowClaimGuestModal(false);
          setIsCreatingNewGuest(false);
          setNewGuestName('');

          // Reload guests
          const guestResult = await apiGetGuests(parseInt(eventId));
          if (guestResult.success && guestResult.guests) {
            const convertedGuests: Guest[] = guestResult.guests.map((g: import('@/lib/api-client').Guest) => ({
              id: g.id.toString(),
              name: g.name,
              amount: g.amount,
              deposit: g.deposit,
              items: g.items.map((item: import('@/lib/api-client').GuestItem) => ({
                id: item.id.toString(),
                note: item.note,
                price: item.price,
              })),
              notes: g.notes,
              paid: g.paid,
              app_user_id: g.app_user_id,
            }));
            setGuests(convertedGuests);
          }
        }
      }
    } catch (error) {
      console.error('Error adding and claiming guest:', error);
    } finally {
      setIsClaimingGuest(false);
    }
  };

  const handleAddMyselfAsGuest = async () => {
    if (!eventId || !currentUser) return;

    setIsClaimingGuest(true);
    try {
      // Check if an unclaimed guest with user's name already exists (case-insensitive)
      const existingGuest = guests.find(
        g => g.name.toLowerCase() === currentUser.name.trim().toLowerCase() && !g.app_user_id
      );

      if (existingGuest) {
        // Claim the existing guest
        const result = await apiClaimGuest(parseInt(eventId), parseInt(existingGuest.id));
        if (result.success) {
          setShowClaimGuestModal(false);
          // Reload guests
          const guestResult = await apiGetGuests(parseInt(eventId));
          if (guestResult.success && guestResult.guests) {
            const convertedGuests: Guest[] = guestResult.guests.map((g: import('@/lib/api-client').Guest) => ({
              id: g.id.toString(),
              name: g.name,
              amount: g.amount,
              deposit: g.deposit,
              items: g.items.map((item: import('@/lib/api-client').GuestItem) => ({
                id: item.id.toString(),
                note: item.note,
                price: item.price,
              })),
              notes: g.notes,
              paid: g.paid,
              app_user_id: g.app_user_id,
            }));
            setGuests(convertedGuests);
          }
        }
      } else {
        // Add new guest with user's account name and claim
        const apiGuest = await apiAddGuest(parseInt(eventId), currentUser.name, 0, 0);
        const result = await apiClaimGuest(parseInt(eventId), apiGuest.id);

        if (result.success) {
          setShowClaimGuestModal(false);
          // Reload guests
          const guestResult = await apiGetGuests(parseInt(eventId));
          if (guestResult.success && guestResult.guests) {
            const convertedGuests: Guest[] = guestResult.guests.map((g: import('@/lib/api-client').Guest) => ({
              id: g.id.toString(),
              name: g.name,
              amount: g.amount,
              deposit: g.deposit,
              items: g.items.map((item: import('@/lib/api-client').GuestItem) => ({
                id: item.id.toString(),
                note: item.note,
                price: item.price,
              })),
              notes: g.notes,
              paid: g.paid,
              app_user_id: g.app_user_id,
            }));
            setGuests(convertedGuests);
          }
        }
      }
    } catch (error) {
      console.error('Error adding myself as guest:', error);
    } finally {
      setIsClaimingGuest(false);
    }
  };

  // Check auth and load event on mount
  useEffect(() => {
    const loadEventData = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);

      try {
        // Get all user's events to find this one
        const apiEvents = await apiGetMyEvents();
        const foundEvent = apiEvents.find((e: import('@/lib/api-client').Event) => e.id.toString() === eventId);

        if (!foundEvent) {
          router.push('/events');
          return;
        }

        // Convert to local format
        const convertedEvent: Event = {
          id: foundEvent.id.toString(),
          name: foundEvent.name,
          guestCode: foundEvent.guest_code,
          guests: [],
          createdAt: new Date(foundEvent.created_at).getTime(),
          paymentMethod: foundEvent.payment_method,
          bankAccountNumber: foundEvent.bank_account_number,
          bankSortCode: foundEvent.bank_sort_code,
          bankAccountName: foundEvent.bank_account_name,
          allowGuestPriceEdit: foundEvent.allow_guest_price_edit,
          allowGuestNotesEdit: foundEvent.allow_guest_notes_edit,
          hostContactInfo: foundEvent.host_contact_info,
        };

        setEvent(convertedEvent);
        setUserRole(foundEvent.role as 'host' | 'guest');

        // Load guests
        const result = await apiGetGuests(parseInt(eventId));
        if (result.success && result.guests) {
          const convertedGuests: Guest[] = result.guests.map((g: import('@/lib/api-client').Guest) => ({
            id: g.id.toString(),
            name: g.name,
            amount: g.amount,
            deposit: g.deposit,
            items: g.items.map((item: import('@/lib/api-client').GuestItem) => ({
              id: item.id.toString(),
              note: item.note,
              price: item.price,
            })),
            notes: g.notes,
            paid: g.paid,
            app_user_id: g.app_user_id,
          }));
          setGuests(convertedGuests);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        router.push('/events');
      } finally {
        setIsLoading(false);
      }
    };

    loadEventData();
  }, [eventId, router]);

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-400">Loading event...</div>
      </div>
    );
  }

  // Calculate totals
  const realGuests = guests.filter(g => g.name !== '');
  const totalBill = realGuests.reduce((sum, guest) => sum + guest.amount, 0);
  const totalDeposits = realGuests.reduce((sum, guest) => sum + guest.deposit, 0);
  const totalOwed = realGuests.reduce((sum, guest) => {
    if (!guest.paid) {
      return sum + (guest.amount - guest.deposit); // Use balance, not full amount
    }
    return sum;
  }, 0);
  const depositsOwed = depositsPaid ? 0 : totalDeposits;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => {
              if (showingBreakdown) {
                // If viewing breakdown, go back to guest detail
                setShowingBreakdown(false);
              } else if (viewingGuestId) {
                // If viewing a guest, go back to guest list
                setViewingGuestId(null);
              } else {
                // If on guest list, go back to events
                router.push('/events');
              }
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-700 dark:text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200 truncate px-3 flex-1 text-center">
            {event.name}
          </h1>

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
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowPaymentDetailsModal(true);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600 dark:text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <span className="text-base text-slate-700 dark:text-slate-300">Payment Details</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowNotesSummary(true);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600 dark:text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-base text-slate-700 dark:text-slate-300">Notes Summary</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      openClaimGuestModal();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600 dark:text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span className="text-base text-slate-700 dark:text-slate-300">My Guest Name</span>
                  </button>

                  {userRole === 'host' && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openEventSettings();
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600 dark:text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-base text-slate-700 dark:text-slate-300">Settings</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {viewingGuestId ? (
          /* Guest Detail or Breakdown View */
          (() => {
            const viewingGuest = guests.find(g => g.id === viewingGuestId);
            if (!viewingGuest) return null;

            if (showingBreakdown) {
              /* Bill Breakdown View */
              const itemsTotal = viewingGuest.items.reduce((sum, item) => sum + (item.price || 0), 0);
              const difference = itemsTotal - viewingGuest.amount;

              return (
                <>
                  {/* Guest Name */}
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-light text-slate-600 dark:text-slate-400 text-center">
                      {viewingGuest.name}
                    </h2>
                  </div>

                  {/* Add Item Input - Host Only */}
                  {userRole === 'host' && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm mb-6 p-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={itemNote}
                          onChange={(e) => setItemNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              document.getElementById('item-price-input')?.focus();
                            }
                          }}
                          className="flex-1 px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                        />
                        <input
                          id="item-price-input"
                          type="number"
                          placeholder="£0.00"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addItemToGuest();
                          }}
                          step="0.01"
                          className="w-24 px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={addItemToGuest}
                          disabled={!itemNote.trim()}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-3 mb-6">
                    {viewingGuest.items.length > 0 ? (
                      viewingGuest.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
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
                  {viewingGuest.items.length > 0 && (
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
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                          Bill Total
                        </span>
                        <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                          £{viewingGuest.amount.toFixed(2)}
                        </span>
                      </div>
                      {userRole === 'host' && Math.abs(difference) > 0.01 && (
                        <button
                          onClick={async () => {
                            try {
                              setGuests(
                                guests.map((g) =>
                                  g.id === viewingGuestId
                                    ? { ...g, amount: itemsTotal }
                                    : g
                                )
                              );
                              await apiUpdateGuest(parseInt(viewingGuestId), { amount: itemsTotal });
                            } catch (error) {
                              console.error('Error updating bill total:', error);
                            }
                          }}
                          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Set bill total to £{itemsTotal.toFixed(2)}
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            }

            /* Guest Detail View */
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
                      {(() => {
                        // User can edit if: (1) they are host, OR (2) they are viewing their own guest AND allowGuestPriceEdit is enabled
                        const canEditPrice = userRole === 'host' || (viewingGuest.app_user_id === currentUser?.id && event?.allowGuestPriceEdit);

                        return (
                          <>
                            {/* Total */}
                            <div className="text-center">
                              <label className="block text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                Total
                              </label>
                              <div
                                onClick={async () => {
                                  if (!canEditPrice) return;

                                  // If guest, check permissions first
                                  if (userRole === 'guest' && viewingGuest.app_user_id === currentUser?.id) {
                                    try {
                                      const events = await apiGetMyEvents();
                                      const latestEvent = events.find(ev => ev.id.toString() === eventId);

                                      if (!latestEvent?.allow_guest_price_edit) {
                                        setErrorMessage('The host has disabled price editing for guests. Please contact the host if you need to update your amount.');
                                        setShowErrorModal(true);
                                        return;
                                      }

                                      // Update local state
                                      if (event && latestEvent) {
                                        setEvent({
                                          ...event,
                                          allowGuestPriceEdit: latestEvent.allow_guest_price_edit,
                                          allowGuestNotesEdit: latestEvent.allow_guest_notes_edit,
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error checking permissions:', error);
                                      setErrorMessage('Unable to verify permissions. Please try again.');
                                      setShowErrorModal(true);
                                      return;
                                    }
                                  }

                                  openCalculator('amount', viewingGuestId, viewingGuest.amount);
                                }}
                                className={`w-full px-4 py-4 text-xl font-semibold rounded-lg text-slate-800 dark:text-slate-100 ${
                                  canEditPrice
                                    ? 'bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                    : 'bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                £{viewingGuest.amount.toFixed(2)}
                                {canEditPrice && (
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
                                onClick={async () => {
                                  if (!canEditPrice) return;

                                  // If guest, check permissions first
                                  if (userRole === 'guest' && viewingGuest.app_user_id === currentUser?.id) {
                                    try {
                                      const events = await apiGetMyEvents();
                                      const latestEvent = events.find(ev => ev.id.toString() === eventId);

                                      if (!latestEvent?.allow_guest_price_edit) {
                                        setErrorMessage('The host has disabled price editing for guests. Please contact the host if you need to update your amount.');
                                        setShowErrorModal(true);
                                        return;
                                      }

                                      // Update local state
                                      if (event && latestEvent) {
                                        setEvent({
                                          ...event,
                                          allowGuestPriceEdit: latestEvent.allow_guest_price_edit,
                                          allowGuestNotesEdit: latestEvent.allow_guest_notes_edit,
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error checking permissions:', error);
                                      setErrorMessage('Unable to verify permissions. Please try again.');
                                      setShowErrorModal(true);
                                      return;
                                    }
                                  }

                                  openCalculator('deposit', viewingGuestId, viewingGuest.deposit);
                                }}
                                className={`w-full px-4 py-4 text-xl font-semibold rounded-lg text-slate-800 dark:text-slate-100 ${
                                  canEditPrice
                                    ? 'bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                    : 'bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                £{viewingGuest.deposit.toFixed(2)}
                                {canEditPrice && (
                                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">tap to edit</div>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
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
                    onClick={async () => {
                      // If guest editing their own notes, check permissions from server
                      if (userRole === 'guest' && viewingGuest.app_user_id === currentUser?.id) {
                        try {
                          const events = await apiGetMyEvents();
                          const latestEvent = events.find(ev => ev.id.toString() === eventId);

                          // Update local state with fresh settings
                          if (event && latestEvent) {
                            setEvent({
                              ...event,
                              allowGuestPriceEdit: latestEvent.allow_guest_price_edit,
                              allowGuestNotesEdit: latestEvent.allow_guest_notes_edit,
                            });
                          }
                        } catch (error) {
                          console.error('Error fetching fresh event settings:', error);
                        }
                      }

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
          /* Guest List View */
          <>
            {/* Bill Total Section - Show at top */}
            <div className={`px-4 py-4 rounded-lg border mb-6 transition-all duration-300 ${
              totalBill > 0 && totalOwed === 0 && depositsOwed === 0
                ? 'bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-600 dark:text-slate-400">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    £{totalBill.toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {realGuests.filter(g => g.paid).length}/{realGuests.length} paid
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span className={`text-base font-semibold ${
                    totalOwed === 0 && depositsOwed === 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    Outstanding
                  </span>
                  <span className={`text-2xl font-bold ${
                    totalOwed === 0 && depositsOwed === 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    £{(totalOwed + depositsOwed).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Guest List */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
          {guests.filter(g => g.name !== '').length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
              </div>
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
                  onClick={() => setViewingGuestId(guest.id)}
                  className="p-3 sm:p-4 rounded-lg border-2 bg-slate-50 dark:bg-slate-700 border-transparent cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {userRole === 'host' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePaid(guest.id);
                          }}
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
                      <div className="flex-1 text-left min-w-0">
                        <span className={`font-medium text-xl sm:text-2xl break-words transition-colors ${
                          guest.paid
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : guest.app_user_id === currentUser?.id
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-800 dark:text-slate-100'
                        }`}>
                          {guest.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                      {(() => {
                        // Show as button if: (1) host, OR (2) guest viewing their own profile (permission check happens onClick)
                        const isOwnProfile = guest.app_user_id === currentUser?.id;
                        const showAsButton = userRole === 'host' || isOwnProfile;

                        return showAsButton ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();

                              // If guest editing their own profile, check permissions from server
                              if (userRole === 'guest' && isOwnProfile) {
                                try {
                                  const events = await apiGetMyEvents();
                                  const latestEvent = events.find(ev => ev.id.toString() === eventId);

                                  if (!latestEvent?.allow_guest_price_edit) {
                                    setErrorMessage('The host has disabled price editing for guests. Please contact the host if you need to update your amount.');
                                    setShowErrorModal(true);
                                    return;
                                  }

                                  // Update local state with fresh settings
                                  if (event && latestEvent) {
                                    setEvent({
                                      ...event,
                                      allowGuestPriceEdit: latestEvent.allow_guest_price_edit,
                                      allowGuestNotesEdit: latestEvent.allow_guest_notes_edit,
                                    });
                                  }
                                } catch (error) {
                                  console.error('Error checking permissions:', error);
                                  setErrorMessage('Unable to verify permissions. Please try again.');
                                  setShowErrorModal(true);
                                  return;
                                }
                              }

                              // Open calculator
                              setCalculatorField('amount');
                              setCalculatorGuestId(guest.id);
                              setCalculatorValue(guest.amount === 0 ? '' : guest.amount.toString());
                              setIsFirstInput(true);
                              setShowCalculator(true);
                            }}
                            className={`text-xl sm:text-2xl font-bold px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                              guest.paid
                                ? 'text-slate-400 dark:text-slate-500'
                                : guest.app_user_id === currentUser?.id
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            £{(guest.amount - guest.deposit).toFixed(2)}
                          </button>
                        ) : (
                          <span className={`text-xl sm:text-2xl font-bold ${
                            guest.paid
                              ? 'text-slate-400 dark:text-slate-500'
                              : guest.app_user_id === currentUser?.id
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-700 dark:text-slate-200'
                          }`}>
                            £{(guest.amount - guest.deposit).toFixed(2)}
                          </span>
                        );
                      })()}
                      {userRole === 'host' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGuest(guest.id);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          aria-label="Delete guest"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Deposits (Host) Row - Only show if there are deposits and user is host */}
              {userRole === 'host' && totalDeposits > 0 && (
                <div className="p-3 sm:p-4 rounded-lg border-2 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => setDepositsPaid(!depositsPaid)}
                        className={`flex-shrink-0 w-10 h-10 sm:w-8 sm:h-8 rounded border-2 transition-colors flex items-center justify-center ${
                          depositsPaid
                            ? 'bg-green-500 border-green-500'
                            : 'border-slate-300 dark:border-slate-600 hover:border-green-400'
                        }`}
                        aria-label="Mark deposits as paid"
                      >
                        {depositsPaid && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-6 h-6 sm:w-5 sm:h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 text-left min-w-0">
                        <span className={`font-medium text-xl sm:text-2xl break-words transition-colors ${
                          depositsPaid
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}>
                          Deposit
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                      <span className={`text-xl sm:text-2xl font-bold px-2 py-1 ${
                        depositsPaid
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        £{totalDeposits.toFixed(2)}
                      </span>
                      <div className="p-2">
                        <div className="w-5 h-5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Guest - Host Only */}
          {userRole === 'host' && (
            <div className="mt-4 sm:mt-6">
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
                  className="w-full px-4 py-3 text-xl sm:text-2xl font-medium border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
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
            </div>
          </>
        )}
      </main>

      {/* Event Settings Modal */}
      {showEventSettings && userRole === 'host' && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Settings Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
              <div className="px-4 h-16 flex items-center justify-between">
                <button
                  onClick={() => setShowEventSettings(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-700 dark:text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200 truncate px-3 flex-1 text-center">
                  Event Settings
                </h1>

                <div className="w-9"></div>
              </div>
            </header>

            {/* Settings Form */}
            <main className="max-w-4xl mx-auto px-4 py-4">
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
                      value={event?.guestCode || ''}
                      readOnly
                      className="flex-1 px-4 py-3 text-base font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(event?.guestCode || '');
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

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={settingsAllowGuestPriceEdit}
                        onChange={(e) => setSettingsAllowGuestPriceEdit(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200">Allow guests to edit prices</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Guests can modify their own price amounts only</div>
                      </div>
                    </label>

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
              </div>
            </main>
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

              {event?.paymentMethod === 'bank_transfer' ? (
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
                          {event?.bankAccountNumber || 'Not set'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(event?.bankAccountNumber || '');
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
                          {event?.bankSortCode || 'Not set'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(event?.bankSortCode || '');
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
                          {event?.bankAccountName || 'Not set'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(event?.bankAccountName || '');
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
                        const bankDetails = `Bank Details for Payment:\n\nAccount Number: ${event?.bankAccountNumber || 'Not set'}\nSort Code: ${event?.bankSortCode || 'Not set'}\nAccount Name: ${event?.bankAccountName || 'Not set'}`;
                        navigator.clipboard.writeText(bankDetails);
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
        const canEditNotes = isHost || (isOwnGuest && event?.allowGuestNotesEdit !== false);

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
                  <div className="flex items-center justify-between">
                    <p className="text-base font-medium text-slate-600 dark:text-slate-400">
                      {guest.name}
                    </p>
                    {/* Show lock icon only when guest is viewing their own notes but editing is disabled */}
                    {isOwnGuest && event?.allowGuestNotesEdit === false && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Textarea */}
                <div className="mb-2">
                  <textarea
                    value={tempGuestNotes}
                    onChange={(e) => setTempGuestNotes(e.target.value)}
                    placeholder={!canEditNotes && !isHost ? "Read only" : "e.g., Vegetarian option, no onions..."}
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

      {/* Claim Guest Modal */}
      {showClaimGuestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleCancelClaimModal}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {(() => {
                const myClaimedGuest = guests.find(g => g.app_user_id === currentUser?.id);
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
                      const unclaimedGuests = guests.filter(g => !g.app_user_id && g.name !== '');

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
                                          setGuests(guests.map(g =>
                                            g.id === myClaimedGuest.id ? { ...g, name: editedGuestName.trim() } : g
                                          ));
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

                            {/* Unclaim button temporarily hidden */}
                            {/* <button
                              onClick={async () => {
                                await handleUnclaimGuest();
                                setIsEditingGuestName(false);
                                setEditedGuestName('');
                              }}
                              className="w-full mt-1 py-2.5 text-xs text-slate-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                            >
                              Unclaim this profile
                            </button> */}
                          </>
                        );
                      }

                      if (unclaimedGuests.length === 0 && !isCreatingNewGuest) {
                        return (
                          <>
                            <div className="text-center py-8 mb-4">
                              <p className="text-slate-600 dark:text-slate-400">No unclaimed guests available.</p>
                              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Add yourself to continue.</p>
                            </div>
                            <button
                              onClick={handleAddMyselfAsGuest}
                              disabled={isClaimingGuest}
                              className="w-full mb-4 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isClaimingGuest ? 'Adding...' : `+ Add myself as ${currentUser?.name}`}
                            </button>
                          </>
                        );
                      }

                      return (
                        <>
                          <div className="mb-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Select your name from the list, or add yourself if your name is not listed.
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              You can change the display name after claiming.
                            </p>
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
                                  }}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <input
                                      type="radio"
                                      name="claimGuest"
                                      value={guest.id}
                                      checked={selectedClaimGuestId === guest.id}
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
                            onClick={handleAddMyselfAsGuest}
                            disabled={isClaimingGuest}
                            className="w-full mb-4 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isClaimingGuest ? 'Adding...' : `+ Add myself as ${currentUser?.name}`}
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
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowErrorModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Unable to Edit</h3>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-500 dark:text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {errorMessage}
              </p>

              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Summary Modal */}
      {showNotesSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50" onClick={() => setShowNotesSummary(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200">Notes Summary</h2>
                <button
                  onClick={() => setShowNotesSummary(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-500 dark:text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Host Contact Info */}
              {event?.hostContactInfo && event.hostContactInfo.trim() && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Host Contact</h3>
                      <div className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap break-words">
                        {event.hostContactInfo}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {guests.length > 0 ? (
                <div className="space-y-2">
                  {guests.filter(g => g.name !== '').sort((a, b) => a.name.localeCompare(b.name)).map((guest) => {
                    const canEdit = userRole === 'host' || (guest.app_user_id === currentUser?.id && event?.allowGuestNotesEdit !== false);

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
                                setViewingGuestId(guest.id);
                                setShowNotesSummary(false);
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
                        {guest.notes && guest.notes.trim() ? (
                          <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">
                            {guest.notes}
                          </div>
                        ) : (
                          <div className="text-slate-400 dark:text-slate-500 text-sm italic">
                            No notes
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
          </div>
        </div>
      )}
    </div>
  );
}
