export type Role = 'customer' | 'provider' | 'admin' | 'support' | 'system';

export type BookingStatus =
  | 'draft'
  | 'quote_ready'
  | 'customer_approved'
  | 'provider_pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'provider_declined'
  | 'expired'
  | 'cancel_requested'
  | 'cancelled'
  | 'disputed'
  | 'failed';

export type ProviderVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'expired';

export type MessageRole = 'customer' | 'assistant' | 'system';
export type MessageType = 'text' | 'card' | 'confirmation' | 'status';

export type ToolName =
  | 'search_services'
  | 'search_providers'
  | 'get_quote'
  | 'prepare_booking'
  | 'submit_booking_request'
  | 'provider_accept_booking'
  | 'create_support_ticket'
  | 'prepare_shopping_list'
  | 'place_order'
  | 'charge_payment'
  | 'resolve_category'
  | 'create_request'
  | 'confirm_request';

export type Intent =
  | 'local_service'
  | 'planning'
  | 'order'
  | 'support'
  | 'unsupported'
  | 'other';

export interface JWTPayload {
  sub: string;
  email?: string;
  role: Role;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
