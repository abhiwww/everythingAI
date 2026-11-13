'use client';

import { useState } from 'react';
import { type BookingStatus } from '@/app/lib/api';
import { Clock, ShieldAlert, Info, Bot } from 'lucide-react';

interface ServiceCardData {
  id: string;
  provider: string;
  service: string;
  area: string;
  price: number;
  rating_label?: string;
  available: boolean;
}

interface ConfirmationCardData {
  action: string;
  service: string;
  address: string;
  datetime: string;
  provider: string;
  price: number;
  currency: string;
  terms: string;
  quoteId: string;
}

interface BookingStatusCardData {
  status: BookingStatus;
  provider?: string;
  scheduled_at?: string;
  message: string;
}

export function MessageBubble({
  message,
  isCustomer = false,
  onSuggest,
}: {
  message: any;
  isCustomer?: boolean;
  onSuggest?: (text: string) => void;
}) {
  const [cardAction, setCardAction] = useState<'idle' | 'selected'>('idle');
  const meta = message.metadata || {};

  const content = message.content || '';

  // Detect embedded cards
  const serviceCard = meta.service_card as ServiceCardData | undefined;
  const confirmationCard = meta.confirmation_card as ConfirmationCardData | undefined;
  const statusCard = meta.status_card as BookingStatusCardData | undefined;
  const suggestions = meta.suggestions as string[] | undefined;
  const demoMode = meta.demo_mode === true;
  const warning = meta.warning as string | undefined;

  return (
    <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isCustomer
            ? 'bg-slate-900 text-white'
            : 'bg-white border border-slate-200 text-slate-900'
        }`}
      >
        {!isCustomer && (
          <div className="flex items-center gap-2 mb-1.5">
            <Bot className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Everyday AI
            </span>
            {demoMode && <span className="demo-badge">Demo data — not real</span>}
          </div>
        )}
        <div className="prose-sm max-w-full break-words whitespace-pre-wrap">{content}</div>

        {warning && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/50 rounded px-2 py-1 border border-amber-100">
            <ShieldAlert className="w-3 h-3" />
            {warning}
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Suggested replies">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSuggest?.(s)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {serviceCard && (
          <ServiceCardPreview
            card={serviceCard}
            onSelect={() => {
              setCardAction('selected');
              onSuggest?.(
                `I'd like details and a quote for ${serviceCard.provider} (${serviceCard.service}, ${serviceCard.area}, ₹${serviceCard.price}).`
              );
            }}
            selected={cardAction === 'selected'}
          />
        )}

        {confirmationCard && (
          <ConfirmationCardPreview
            card={confirmationCard}
            onConfirm={() => {
              setCardAction('selected');
              onSuggest?.(
                `I confirm the booking request for ${confirmationCard.service} with ${confirmationCard.provider} at ${confirmationCard.address} on ${confirmationCard.datetime} for ${confirmationCard.currency} ${confirmationCard.price}. (Quote ${confirmationCard.quoteId})`
              );
            }}
            confirmed={cardAction === 'selected'}
          />
        )}

        {statusCard && <BookingStatusPreview card={statusCard} />}
      </div>
      {isCustomer && (
        <span className="ml-2 text-[10px] text-slate-400 mt-0.5">
          {new Date(message.created_at || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </div>
  );
}

function ServiceCardPreview({
  card,
  onSelect,
  selected,
}: {
  card: ServiceCardData;
  onSelect: () => void;
  selected?: boolean;
}) {
  return (
    <div className="mt-3 card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold">{card.provider}</div>
          <div className="text-xs text-slate-500">{card.service} • {card.area}</div>
          <div className="mt-1 text-sm font-medium">₹{card.price}</div>
          {card.rating_label && (
            <div className="mt-1 text-xs text-slate-500">{card.rating_label}</div>
          )}
        </div>
        <span className={`status-badge ${card.available ? 'confirmed' : 'pending'}`}>
          {card.available ? 'Available' : 'New provider'}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500">Select to ask for details and a quote in chat.</p>
        <button type="button" onClick={onSelect} className="ml-auto btn-secondary" disabled={!card.available}>
          {selected ? 'Added to message' : 'View details'}
        </button>
      </div>
    </div>
  );
}

function ConfirmationCardPreview({
  card,
  onConfirm,
  confirmed,
}: {
  card: ConfirmationCardData;
  onConfirm: () => void;
  confirmed?: boolean;
}) {
  return (
    <div className="mt-3 card p-4 border-blue-200 bg-blue-50">
      <div className="flex items-start gap-2 mb-2">
        <Info className="w-5 h-5 text-blue-600 shrink-0" aria-hidden />
        <div className="text-sm font-semibold text-slate-900">Confirm your booking request</div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-slate-500">Service</dt>
        <dd className="font-medium">{card.service}</dd>
        <dt className="text-slate-500">Provider</dt>
        <dd className="font-medium">{card.provider}</dd>
        <dt className="text-slate-500">Address</dt>
        <dd className="col-span-2 font-medium">{card.address}</dd>
        <dt className="text-slate-500">Date / time</dt>
        <dd className="col-span-2 font-medium">{card.datetime}</dd>
        <dt className="text-slate-500">Price</dt>
        <dd className="font-medium">{card.currency} {card.price}</dd>
        <dt className="text-slate-500">Terms</dt>
        <dd className="col-span-2 text-xs text-slate-500">{card.terms}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-600">
          Confirming sends a request to the provider — it is <strong>not confirmed</strong> until
          the provider accepts. You can review details before sending.
        </p>
        <button type="button" onClick={onConfirm} className="ml-auto btn-primary" aria-label="Add confirmation to chat">
          {confirmed ? 'Added to message' : 'Confirm in chat'}
        </button>
      </div>
    </div>
  );
}

function BookingStatusPreview({ card }: { card: BookingStatusCardData }) {
  const statusClassMap: Record<string, string> = {
    draft: 'pending',
    quote_ready: 'pending',
    customer_approved: 'pending',
    provider_pending: 'pending',
    confirmed: 'confirmed',
    in_progress: 'in-progress',
    'in-progress': 'in-progress',
    completed: 'completed',
    provider_declined: 'declined',
    declined: 'declined',
    expired: 'cancelled',
    cancel_requested: 'pending',
    cancelled: 'cancelled',
    disputed: 'declined',
    failed: 'declined',
    pending: 'pending',
  };
  const statusClass = statusClassMap[card.status] || 'pending';

  return (
    <div className="mt-3 card p-4 border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-slate-500" />
        <div className="text-sm font-semibold text-slate-900">Booking status</div>
        <span className={`ml-auto status-badge ${statusClass}`}>
          {String(card.status).replace(/_/g, ' ')}
        </span>
      </div>
      <div className="text-sm text-slate-700">{card.message}</div>
      {card.provider && (
        <div className="mt-2 text-xs text-slate-500">Provider: {card.provider}</div>
      )}
      {card.scheduled_at && (
        <div className="mt-1 text-xs text-slate-500">
          Scheduled: {new Date(card.scheduled_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
