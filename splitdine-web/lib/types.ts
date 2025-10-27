// Shared type definitions for SplitDine

export interface Item {
  id: string;
  note: string;
  price?: number | null;
}

export interface Guest {
  id: string;
  name: string;
  amount: number;
  deposit: number;
  items: Item[];
  notes: string;
  paid: boolean;
  app_user_id?: number | null;
}

export interface Event {
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

export interface UserEventMembership {
  eventId: string;
  role: 'host' | 'guest';
  joinedAt: number;
}

export interface EventListItemProps {
  event: Event & { userRole: 'host' | 'guest' };
  onOpenEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onCopyGuestCode: (code: string) => void;
  onShowToast: (message: string) => void;
  onShowPaymentDetails: (eventId: string) => void;
  onShowNotesSummary: (eventId: string) => void;
  onShowContactHost: (eventId: string) => void;
  onShowManageGuestName: (eventId: string) => void;
  onLeaveEvent: (eventId: string) => void;
}
