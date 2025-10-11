'use client';

import { useState, useRef, useEffect } from 'react';

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
  const [showEventCreatedModal, setShowEventCreatedModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCodes, setShowCodes] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const itemNoteRef = useRef<HTMLInputElement>(null);
  const editAmountRef = useRef<HTMLInputElement>(null);
  const eventNameRef = useRef<HTMLInputElement>(null);
  const joinCodeRef = useRef<HTMLInputElement>(null);

  // Helper function to generate a random 6-character code
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Toast notification helper
  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Load events and memberships from localStorage on mount
  useEffect(() => {
    const storedEvents = localStorage.getItem('splitdine_events');
    const storedMemberships = localStorage.getItem('splitdine_memberships');
    const storedCurrentEvent = localStorage.getItem('splitdine_current_event');

    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
    if (storedMemberships) {
      setUserMemberships(JSON.parse(storedMemberships));
    }
    if (storedCurrentEvent) {
      const { eventId, role } = JSON.parse(storedCurrentEvent);
      setCurrentEventId(eventId);
      setUserRole(role);
      // Load guests for this event
      if (storedEvents) {
        const events = JSON.parse(storedEvents);
        const event = events.find((e: Event) => e.id === eventId);
        if (event) {
          setGuests(event.guests);
        }
      }
    }
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem('splitdine_events', JSON.stringify(events));
    }
  }, [events]);

  // Save memberships to localStorage whenever they change
  useEffect(() => {
    if (userMemberships.length > 0) {
      localStorage.setItem('splitdine_memberships', JSON.stringify(userMemberships));
    }
  }, [userMemberships]);

  // Save current event to localStorage whenever it changes
  useEffect(() => {
    if (currentEventId && userRole) {
      localStorage.setItem('splitdine_current_event', JSON.stringify({ eventId: currentEventId, role: userRole }));
    }
  }, [currentEventId, userRole]);

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

  // Event functions
  const startNewEvent = () => {
    if (eventName.trim()) {
      const hostCode = generateCode();
      const guestCode = generateCode();
      const newEvent: Event = {
        id: Date.now().toString(),
        name: eventName.trim(),
        hostCode: hostCode,
        guestCode: guestCode,
        guests: [],
        createdAt: Date.now(),
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

      // Show the event created modal
      setShowEventCreatedModal(true);
    }
  };

  const copyGuestCode = (code: string) => {
    const shareMessage = `Join my SplitDine event!\n\nEvent: ${currentEvent?.name}\nGuest Code: ${code}\n\nGo to https://www.splitdine.com and enter this code to join.\n\nQuestions? Email us at info@splitdine.com`;
    navigator.clipboard.writeText(shareMessage);
    showToastNotification('Guest invite copied! Ready to share.');
  };

  const copyHostCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToastNotification('Host code copied to clipboard.');
  };

  const joinEvent = () => {
    const code = joinCode.trim().toUpperCase();

    // Check if it's a host code or guest code
    const eventByHostCode = events.find(e => e.hostCode === code);
    const eventByGuestCode = events.find(e => e.guestCode === code);

    const event = eventByHostCode || eventByGuestCode;
    const role = eventByHostCode ? 'host' : 'guest';

    if (event) {
      // Check if already a member
      const existingMembership = userMemberships.find(m => m.eventId === event.id);
      if (!existingMembership) {
        const newMembership: UserEventMembership = {
          eventId: event.id,
          role: role,
          joinedAt: Date.now(),
        };
        setUserMemberships([...userMemberships, newMembership]);
      }

      setCurrentEventId(event.id);
      setUserRole(existingMembership?.role || role);
      setGuests(event.guests);
      setJoinCode('');
      setShowJoinEventModal(false);
    } else {
      showToastNotification('Event not found. Please check the code and try again.');
    }
  };

  const leaveEvent = () => {
    setCurrentEventId(null);
    setUserRole(null);
    setGuests([]);
    localStorage.removeItem('splitdine_current_event');
  };

  const openEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    const membership = userMemberships.find(m => m.eventId === eventId);

    if (event && membership) {
      setCurrentEventId(eventId);
      setUserRole(membership.role);
      setGuests(event.guests);
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
    localStorage.removeItem('splitdine_current_event');
    setShowDeleteConfirmModal(false);
  };

  // Guest functions
  const addGuest = () => {
    if (name.trim()) {
      const newGuest: Guest = {
        id: Date.now().toString(),
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        deposit: parseFloat(deposit) || 0,
        items: [],
        notes: '',
        paid: false,
      };
      setGuests([...guests, newGuest]);
      setName('');
      setAmount('');
      setDeposit('');
      nameInputRef.current?.focus();
    }
  };

  const removeGuest = (id: string) => {
    if (userRole === 'host') {
      setGuests(guests.filter((guest) => guest.id !== id));
      if (selectedGuestId === id) {
        setSelectedGuestId(null);
      }
    }
  };

  const selectGuest = (id: string) => {
    setEditingGuestId(id);
    setShowItemsModal(true);
    setTimeout(() => itemNoteRef.current?.focus(), 0);
  };

  const addItemToGuest = () => {
    if (editingGuestId && itemNote.trim()) {
      setGuests(
        guests.map((guest) =>
          guest.id === editingGuestId
            ? {
                ...guest,
                items: [
                  ...guest.items,
                  { id: Date.now().toString(), note: itemNote.trim() },
                ],
              }
            : guest
        )
      );
      setItemNote('');
      itemNoteRef.current?.focus();
    }
  };

  const removeItem = (guestId: string, itemId: string) => {
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
  };

  const startEditingAmount = (guestId: string, currentAmount: number, currentDeposit: number) => {
    if (userRole === 'host') {
      setEditingAmountId(guestId);
      setEditAmount(currentAmount.toString());
      setEditDeposit(currentDeposit.toString());
      setTimeout(() => editAmountRef.current?.select(), 0);
    }
  };

  const saveAmount = () => {
    if (editingAmountId && editAmount) {
      setGuests(
        guests.map((guest) =>
          guest.id === editingAmountId
            ? {
                ...guest,
                amount: parseFloat(editAmount) || 0,
                deposit: parseFloat(editDeposit) || 0
              }
            : guest
        )
      );
      setEditingAmountId(null);
      setEditAmount('');
      setEditDeposit('');
    }
  };

  const cancelEditAmount = () => {
    setEditingAmountId(null);
    setEditAmount('');
    setEditDeposit('');
  };

  const togglePaid = (guestId: string) => {
    if (userRole === 'host') {
      setGuests(
        guests.map((guest) =>
          guest.id === guestId
            ? { ...guest, paid: !guest.paid }
            : guest
        )
      );
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
          {currentEvent ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {currentEvent.name}
            </div>
          ) : (
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">
              SplitDine
            </h1>
          )}
          {currentEvent && (
            <button
              onClick={leaveEvent}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              ← Back to Events
            </button>
          )}
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

        {/* Join Event Modal */}
        {showJoinEventModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Join Event
              </h2>
              <input
                ref={joinCodeRef}
                type="text"
                placeholder="Enter event code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') joinEvent();
                  if (e.key === 'Escape') {
                    setShowJoinEventModal(false);
                    setJoinCode('');
                  }
                }}
                className="w-full px-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 mb-4 uppercase"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinEventModal(false);
                    setJoinCode('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={joinEvent}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Join Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Created Success Modal */}
        {showEventCreatedModal && currentEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-5 max-w-sm w-full">
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-green-600 dark:text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Event Created!
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  Guest code to share
                </p>
              </div>

              {/* Guest Code - Compact */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 mb-3 border border-green-200 dark:border-green-700">
                <div className="text-center">
                  <div className="text-3xl font-bold font-mono text-green-900 dark:text-green-100 tracking-wider mb-3">
                    {currentEvent.guestCode}
                  </div>
                  <button
                    onClick={() => copyGuestCode(currentEvent.guestCode)}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    Share
                  </button>
                </div>
              </div>

              {/* Info message - Compact */}
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-3">
                Access codes anytime via &quot;Codes&quot; button
              </p>

              <button
                onClick={() => setShowEventCreatedModal(false)}
                className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
              >
                Got it!
              </button>
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

        {!currentEvent ? (
          /* Landing Page */
          <div className="space-y-6">
            {/* Start/Join Buttons */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6 text-center">
                Welcome! Get started:
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setShowStartEventModal(true);
                    setTimeout(() => eventNameRef.current?.focus(), 0);
                  }}
                  className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-lg"
                >
                  Start New Event
                </button>
                <button
                  onClick={() => {
                    setShowJoinEventModal(true);
                    setTimeout(() => joinCodeRef.current?.focus(), 0);
                  }}
                  className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-lg"
                >
                  Join Event
                </button>
              </div>
            </div>

            {/* My Events List */}
            {myEvents.length > 0 && (
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
            )}
          </div>
        ) : (
          /* Event View */
          <>
            {/* Total */}
            <div className={`rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6 transition-colors ${
              totalBill > 0 && totalOwed === 0
                ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-700'
                : 'bg-white dark:bg-slate-800'
            }`}>
              <div className="flex flex-col items-center">
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
                {totalBill > 0 && (
                  <div className={`mt-2 text-xs font-medium ${
                    totalOwed === 0
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {totalOwed === 0 ? (
                      <>✓ Fully Paid!</>
                    ) : totalDeposits > 0 ? (
                      <>Deposits £{totalDeposits.toFixed(2)} · Still Owed £{totalOwed.toFixed(2)}</>
                    ) : (
                      <>Still Owed £{totalOwed.toFixed(2)}</>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Add Guest Form */}
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

            {/* Items Modal */}
            {showItemsModal && editingGuest && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full my-8">
                  <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-slate-800 pb-2 -mt-6 pt-6 z-10">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                      {editingGuest.name}
                    </h2>
                    <button
                      onClick={() => {
                        setShowItemsModal(false);
                        setEditingGuestId(null);
                        setItemNote('');
                      }}
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
                <p className="text-slate-500 dark:text-slate-400 text-center py-8 text-sm sm:text-base">
                  No guests added yet. Add your first guest above!
                </p>
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

            {/* Codes Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-4 mt-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    {userRole === 'host' && (
                      <button
                        onClick={() => copyGuestCode(currentEvent.guestCode)}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                        Share
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCodes(!showCodes)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                    </svg>
                    Codes
                  </button>
                </div>

                {/* Collapsible Code Display */}
                {showCodes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {userRole === 'host' && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-800 dark:text-orange-300 mb-1">
                            Host Code (For viewing on other devices)
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-base text-orange-900 dark:text-orange-100">
                              {currentEvent.hostCode}
                            </span>
                            <button
                              onClick={() => copyHostCode(currentEvent.hostCode)}
                              className="ml-2 p-1.5 hover:bg-orange-100 dark:hover:bg-orange-800/40 rounded transition-colors"
                              title="Copy host code"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-orange-700 dark:text-orange-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                          Guest Code {userRole === 'host' ? '(Share this)' : ''}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-base text-green-900 dark:text-green-100">
                            {currentEvent.guestCode}
                          </span>
                          {userRole === 'host' && (
                            <button
                              onClick={() => copyGuestCode(currentEvent.guestCode)}
                              className="ml-2 p-1.5 hover:bg-green-100 dark:hover:bg-green-800/40 rounded transition-colors"
                              title="Copy & share guest code"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-700 dark:text-green-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Event Button (Host Only) */}
                    {userRole === 'host' && (
                      <button
                        onClick={() => setShowDeleteConfirmModal(true)}
                        className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        Delete Event
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details - Bottom Section */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow-md p-5 sm:p-6 mt-6 border-2 border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-blue-600 dark:text-blue-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Payment Details
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">
                    Use these details for deposits and payments
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Account Number */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Account Number
                    </div>
                    <div className="font-mono text-lg sm:text-xl font-semibold text-blue-900 dark:text-blue-200">
                      18053208
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('18053208');
                      showToastNotification('Account number copied!');
                    }}
                    className="ml-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                    Copy
                  </button>
                </div>

                {/* Sort Code */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Sort Code
                    </div>
                    <div className="font-mono text-lg sm:text-xl font-semibold text-blue-900 dark:text-blue-200">
                      04-00-03
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('04-00-03');
                      showToastNotification('Sort code copied!');
                    }}
                    className="ml-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                    Copy
                  </button>
                </div>

                {/* Account Name */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Account Name
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-200 break-words">
                      Brookfield Comfort - Trading as Brookfield Socials
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('Brookfield Comfort - Trading as Brookfield Socials');
                      showToastNotification('Account name copied!');
                    }}
                    className="ml-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-400 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
