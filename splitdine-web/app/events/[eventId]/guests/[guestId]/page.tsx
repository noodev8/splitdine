'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Event, Guest } from '@/lib/types';
import CalculatorModal from '@/components/calculator-modal';
import {
  getMyEvents as apiGetMyEvents,
  getGuests as apiGetGuests,
  updateGuest as apiUpdateGuest,
  getCurrentUser,
  type GuestItem,
} from '@/lib/api-client';

export default function GuestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const guestId = params.guestId as string;

  // Auth state
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string; name: string } | null>(null);

  // Event and guest state
  const [event, setEvent] = useState<Event | null>(null);
  const [userRole, setUserRole] = useState<'host' | 'guest' | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [editingGuestNotesId, setEditingGuestNotesId] = useState<string | null>(null);
  const [tempGuestNotes, setTempGuestNotes] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculator modal state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInitialValue, setCalculatorInitialValue] = useState(0);
  const [calculatorField, setCalculatorField] = useState<'amount' | 'deposit' | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const user = await getCurrentUser();
        setCurrentUser(user);

        // Get event data
        const events = await apiGetMyEvents();
        const foundEvent = events.find(e => e.id.toString() === eventId);

        if (!foundEvent) {
          router.push('/events');
          return;
        }

        // Properly map API response to Event type
        setEvent({
          id: foundEvent.id.toString(),
          name: foundEvent.name,
          guestCode: foundEvent.guest_code || '',
          guests: [], // Not needed for this page
          createdAt: 0, // Not needed for this page
          allowGuestPriceEdit: foundEvent.allow_guest_price_edit,
          allowGuestNotesEdit: foundEvent.allow_guest_notes_edit,
          paymentMethod: foundEvent.payment_method,
          bankAccountNumber: foundEvent.bank_account_number,
          bankSortCode: foundEvent.bank_sort_code,
          bankAccountName: foundEvent.bank_account_name,
          hostContactInfo: foundEvent.host_contact_info,
        } as Event);
        setUserRole(foundEvent.role);

        // Get guests
        const result = await apiGetGuests(parseInt(eventId));
        if (!result.success || !result.guests) {
          router.push(`/events/${eventId}`);
          return;
        }

        const foundGuest = result.guests.find((g: { id: number }) => g.id.toString() === guestId);

        if (!foundGuest) {
          router.push(`/events/${eventId}`);
          return;
        }

        // Convert API guest to local Guest type
        const convertedGuest: Guest = {
          id: foundGuest.id.toString(),
          name: foundGuest.name,
          amount: foundGuest.amount,
          deposit: foundGuest.deposit,
          items: foundGuest.items.map((item: GuestItem) => ({
            id: item.id.toString(),
            note: item.note,
            price: item.price ?? null
          })),
          notes: foundGuest.notes,
          paid: foundGuest.paid,
          app_user_id: foundGuest.app_user_id
        };

        setGuest(convertedGuest);
      } catch (error) {
        console.error('Error loading data:', error);
        router.push('/events');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [eventId, guestId, router]);

  const openCalculator = (field: 'amount' | 'deposit', initialValue: number) => {
    setCalculatorField(field);
    setCalculatorInitialValue(initialValue);
    setShowCalculator(true);
  };

  const handleCalculatorSave = async (numValue: number) => {
    if (!calculatorField || !guest) return;

    try {
      const updates = calculatorField === 'amount'
        ? { amount: numValue }
        : { deposit: numValue };

      setGuest({
        ...guest,
        ...updates
      });

      await apiUpdateGuest(parseInt(guestId), updates);

      setShowCalculator(false);
      setCalculatorField(null);
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  };

  const saveGuestNotes = async () => {
    if (!guest) return;

    try {
      setGuest({
        ...guest,
        notes: tempGuestNotes
      });

      await apiUpdateGuest(parseInt(guestId), { notes: tempGuestNotes });
      setEditingGuestNotesId(null);
      setTempGuestNotes('');
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!guest || !event) {
    return null;
  }

  const canEditPrice = userRole === 'host' || (guest.app_user_id === currentUser?.id && event?.allowGuestPriceEdit);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push(`/events/${eventId}`)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-700 dark:text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{event.name}</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Guest Name */}
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-light text-slate-600 dark:text-slate-400 text-center">
            {guest.name}
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
                  £{(guest.amount - guest.deposit).toFixed(2)}
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
                  onClick={async () => {
                    if (!canEditPrice) return;

                    // If guest, check permissions first
                    if (userRole === 'guest' && guest.app_user_id === currentUser?.id) {
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

                    openCalculator('amount', guest.amount);
                  }}
                  className={`w-full px-4 py-4 text-xl font-semibold rounded-lg text-slate-800 dark:text-slate-100 ${
                    canEditPrice
                      ? 'bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  £{guest.amount.toFixed(2)}
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
                    if (userRole === 'guest' && guest.app_user_id === currentUser?.id) {
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

                    openCalculator('deposit', guest.deposit);
                  }}
                  className={`w-full px-4 py-4 text-xl font-semibold rounded-lg text-slate-800 dark:text-slate-100 ${
                    canEditPrice
                      ? 'bg-slate-50 dark:bg-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  £{guest.deposit.toFixed(2)}
                  {canEditPrice && (
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
            onClick={() => router.push(`/events/${eventId}/guests/${guestId}/breakdown`)}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-600 rounded-lg py-4 px-6 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            Bill Breakdown
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">(Optional)</span>
          </button>

          <button
            onClick={async () => {
              // If guest editing their own notes, check permissions from server
              if (userRole === 'guest' && guest.app_user_id === currentUser?.id) {
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

              setTempGuestNotes(guest.notes);
              setEditingGuestNotesId(guestId);
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-600 rounded-lg py-4 px-6 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Pre-order / Notes
          </button>
        </div>
      </div>

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        initialValue={calculatorInitialValue}
        onSave={handleCalculatorSave}
        onCancel={() => {
          setShowCalculator(false);
          setCalculatorField(null);
        }}
      />

      {/* Guest Notes Modal */}
      {editingGuestNotesId && (() => {
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
                      className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveGuestNotes}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
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

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Unable to Edit
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => {
                setShowErrorModal(false);
                setErrorMessage('');
              }}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
