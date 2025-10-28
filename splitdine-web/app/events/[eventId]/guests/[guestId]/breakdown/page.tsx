'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Event, Guest } from '@/lib/types';
import {
  getMyEvents as apiGetMyEvents,
  getGuests as apiGetGuests,
  updateGuest as apiUpdateGuest,
  addGuestItem as apiAddGuestItem,
  deleteGuestItem as apiDeleteGuestItem,
  getCurrentUser,
  type GuestItem,
} from '@/lib/api-client';

export default function BillBreakdownPage() {
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

  // Item management state
  const [itemNote, setItemNote] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  // Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load user and event data
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

  const addItemToGuest = async () => {
    if (!guest || !itemNote.trim()) return;

    // Check permissions for guests
    if (userRole === 'guest' && guest.app_user_id === currentUser?.id) {
      try {
        const events = await apiGetMyEvents();
        const latestEvent = events.find(ev => ev.id.toString() === eventId);

        if (!latestEvent?.allow_guest_price_edit) {
          setErrorMessage('The host has disabled item editing for guests. Please contact the host if you need to update your bill breakdown.');
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

    const noteText = itemNote.trim();
    const priceValue = itemPrice.trim() ? parseFloat(itemPrice) : undefined;

    try {
      const apiItem = await apiAddGuestItem(parseInt(guestId), noteText, priceValue);

      const newItem = {
        id: apiItem.id.toString(),
        note: apiItem.note,
        price: apiItem.price
      };

      setGuest({
        ...guest,
        items: [newItem, ...guest.items],
      });
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
  };

  const removeItem = async (itemId: string) => {
    if (!guest) return;

    // Check permissions for guests
    if (userRole === 'guest' && guest.app_user_id === currentUser?.id) {
      try {
        const events = await apiGetMyEvents();
        const latestEvent = events.find(ev => ev.id.toString() === eventId);

        if (!latestEvent?.allow_guest_price_edit) {
          setErrorMessage('The host has disabled item editing for guests. Please contact the host if you need to update your bill breakdown.');
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

    // Remove from local state first (immediate UI feedback)
    setGuest({
      ...guest,
      items: guest.items.filter((item) => item.id !== itemId)
    });

    // Sync with API
    try {
      await apiDeleteGuestItem(parseInt(itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const updateBillTotal = async (newTotal: number) => {
    if (!guest) return;

    try {
      setGuest({
        ...guest,
        amount: newTotal
      });
      await apiUpdateGuest(parseInt(guestId), { amount: newTotal });
    } catch (error) {
      console.error('Error updating bill total:', error);
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

  const canEditItems = userRole === 'host' || (guest.app_user_id === currentUser?.id && event?.allowGuestPriceEdit);
  const itemsTotal = guest.items.reduce((sum, item) => sum + (item.price || 0), 0);
  const difference = itemsTotal - guest.amount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-slate-700 dark:text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Bill Breakdown</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Guest Name */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-light text-slate-600 dark:text-slate-400 text-center">
            {guest.name}
          </h2>
        </div>

        {/* Add Item Input */}
        {canEditItems && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm mb-6 p-3 sm:p-4">
            <div className="flex gap-1.5 sm:gap-2">
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
                className="flex-1 min-w-0 px-2 sm:px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
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
                className="w-16 sm:w-24 px-2 sm:px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={addItemToGuest}
                disabled={!itemNote.trim()}
                className="px-2.5 sm:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3 mb-6">
          {guest.items.length > 0 ? (
            guest.items.map((item) => (
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
                {canEditItems && (
                  <button
                    onClick={() => removeItem(item.id)}
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
        {guest.items.length > 0 && (
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
                £{guest.amount.toFixed(2)}
              </span>
            </div>
            {userRole === 'host' && Math.abs(difference) > 0.01 && (
              <button
                onClick={() => updateBillTotal(itemsTotal)}
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
      </div>

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
