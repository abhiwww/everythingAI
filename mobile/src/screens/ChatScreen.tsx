/**
 * Customer chat screen — the main conversational interface.
 * One clean chat screen with input, message history, service cards, confirmation cards, and status cards.
 */

import { useState, useCallback, useEffect, useRef, type ComponentRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../api';

export default function ChatScreen() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    loadOrCreateConversation();
  }, []);

  const loadOrCreateConversation = useCallback(async () => {
    try {
      const listRes = await api.conversations.list();
      if (listRes.ok) {
        const data = await listRes.json();
        if (data.conversations && data.conversations.length > 0) {
          setConversationId(data.conversations[0].id);
          loadMessages(data.conversations[0].id);
          return;
        }
      }
      const created = await api.conversations.create({ title: 'New conversation' });
      if (created.ok) {
        const cdata = await created.json();
        setConversationId(cdata.conversation.id);
      }
    } catch {
      Alert.alert('Error', 'Unable to load conversations');
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await api.conversations.messages(id);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // silent
    }
  }, []);

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: any) => {
    e?.preventDefault?.();
    if (!input.trim() || !conversationId || sending) return;
    const text = input;
    setInput('');
    setSending(true);

    setMessages((prev) => [
      ...prev,
      { role: 'customer', content: text, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await api.conversations.send(conversationId, { content: text });
      if (res.ok) {
        const data = await res.json();
        const assistant = data.assistant || { reply: '', demo_mode: false };
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: assistant.reply,
            created_at: new Date().toISOString(),
            metadata: assistant,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!conversationId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f2937" />
        <Text style={styles.loadingText}>Starting conversation…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Demo notice banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoText}>
          Demo mode — sample data only. No real provider availability, bookings, or payments.
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => (
          <View
            key={m.id || m.created_at}
            style={[
              styles.messageWrapper,
              m.role === 'customer' ? styles.customerWrapper : styles.assistantWrapper,
            ]}
          >
            {m.role !== 'customer' && (
              <View style={styles.assistantHeader}>
                <Text style={styles.assistantName}>Everyday AI</Text>
                {m.metadata?.demo_mode && (
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>Demo data — not real</Text>
                  </View>
                )}
              </View>
            )}
            <Text
              style={[
                styles.messageBubble,
                m.role === 'customer' ? styles.customerBubble : styles.assistantBubble,
              ]}
            >
              {m.content}
            </Text>
            {m.metadata?.warning && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>{m.metadata.warning}</Text>
              </View>
            )}
            {m.metadata?.suggestions && m.metadata.suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {m.metadata.suggestions.map((s: string, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => setInput(s)}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {m.metadata?.service_card && (
              <View style={styles.cardContainer}>
                <ServiceCard card={m.metadata.service_card} />
              </View>
            )}
            {m.metadata?.confirmation_card && (
              <View style={styles.cardContainer}>
                <ConfirmationCard card={m.metadata.confirmation_card} />
              </View>
            )}
            {m.metadata?.status_card && (
              <View style={styles.cardContainer}>
                <StatusCard card={m.metadata.status_card} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask for help (e.g. “I need my bathroom cleaned today”)"
          multiline
          numberOfLines={4}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending || !input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Read-only searches and suggestions may happen without approval. Bookings, orders, and
        payments require your explicit confirmation.
      </Text>
    </View>
  );
}

/** Service card shown in chat */
function ServiceCard({ card }: { card: any }) {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceCardHeader}>
        <Text style={styles.serviceCardProvider}>{card.provider}</Text>
        <Text style={[styles.statusBadge, card.available ? styles.statusAvailable : styles.statusNew]}>
          {card.available ? 'Available' : 'New provider'}
        </Text>
      </View>
      <Text style={styles.serviceCardService}>{card.service}</Text>
      <Text style={styles.serviceCardArea}>{card.area}</Text>
      <View style={styles.serviceCardPriceRow}>
        <Text style={styles.serviceCardPrice}>₹{card.price}</Text>
        {card.rating_label && (
          <Text style={styles.serviceCardRating}>{card.rating_label}</Text>
        )}
      </View>
      <Text style={styles.serviceCardNote}>Select to view details and request a quote.</Text>
    </View>
  );
}

/** Confirmation card shown in chat */
function ConfirmationCard({ card }: { card: any }) {
  return (
    <View style={styles.confirmationCard}>
      <View style={styles.confirmationHeader}>
        <Text style={styles.confirmationTitle}>Confirm your booking request</Text>
      </View>
      <View style={styles.confirmationFields}>
        <View style={styles.row} key="service">
          <Text style={styles.rowLabel}>Service</Text>
          <Text style={styles.rowValue}>{card.service}</Text>
        </View>
        <View style={styles.row} key="provider">
          <Text style={styles.rowLabel}>Provider</Text>
          <Text style={styles.rowValue}>{card.provider}</Text>
        </View>
        <View style={styles.row} key="address">
          <Text style={styles.rowLabel}>Address</Text>
          <Text style={styles.rowValue}>{card.address}</Text>
        </View>
        <View style={styles.row} key="datetime">
          <Text style={styles.rowLabel}>Date / time</Text>
          <Text style={styles.rowValue}>{card.datetime}</Text>
        </View>
        <View style={styles.row} key="price">
          <Text style={styles.rowLabel}>Price</Text>
          <Text style={styles.rowValue}>₹{card.price}</Text>
        </View>
      </View>
      <Text style={styles.confirmationTerms}>{card.terms}</Text>
      <View style={styles.confirmationActions}>
        <TouchableOpacity style={styles.confirmButton} onPress={() => {}}>
          <Text style={styles.confirmButtonText}>Confirm request</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => {}}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.confirmationNote}>
        Pressing Confirm sends a request to the provider — it is not a booking until they accept.
      </Text>
    </View>
  );
}

/** Booking status card shown in chat */
function StatusCard({ card }: { card: any }) {
  const statusColor =
    card.status === 'confirmed' || card.status === 'completed'
      ? '#059669'
      : card.status === 'provider_declined' || card.status === 'cancelled'
      ? '#dc2626'
      : card.status === 'provider_pending'
      ? '#d97706'
      : '#6b7280';

  return (
    <View style={[styles.statusCard, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
      <View style={styles.statusHeader}>
        <Text style={styles.statusTitle}>Booking status</Text>
        <Text style={[styles.statusCardBadge, { backgroundColor: statusColor + '22', color: statusColor }]}>
          {card.status.replace('_', ' ')}
        </Text>
      </View>
      <Text style={styles.statusMessage}>{card.message}</Text>
      {card.provider && (
        <Text style={styles.statusProvider}>Provider: {card.provider}</Text>
      )}
      {card.scheduled_at && (
        <Text style={styles.statusScheduled}>
          Scheduled: {new Date(card.scheduled_at).toLocaleString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  demoBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  demoText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  messageWrapper: { marginHorizontal: 16, marginVertical: 6 },
  customerWrapper: { alignItems: 'flex-end' },
  assistantWrapper: { alignItems: 'flex-start' },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  assistantName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  demoBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  demoBadgeText: { fontSize: 9, color: '#92400e', fontWeight: '700' },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    fontSize: 15,
    lineHeight: 22,
  },
  customerBubble: {
    backgroundColor: '#1f2937',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    color: '#111827',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  warningContainer: {
    marginTop: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 8,
  },
  warningText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: { fontSize: 13, color: '#374151' },
  cardContainer: { marginTop: 8, marginHorizontal: 4 },
  serviceCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceCardProvider: { fontSize: 15, fontWeight: '700', color: '#111827' },
  serviceCardService: { fontSize: 13, color: '#374151', marginBottom: 2 },
  serviceCardArea: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  serviceCardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceCardPrice: { fontSize: 16, fontWeight: '800', color: '#111827' },
  serviceCardRating: { fontSize: 12, color: '#6b7280' },
  serviceCardNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: '700',
  },
  statusAvailable: { backgroundColor: '#dcfce7', color: '#166534' },
  statusNew: { backgroundColor: '#fef3c7', color: '#92400e' },
  confirmationCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
  },
  confirmationHeader: { marginBottom: 10 },
  confirmationTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  confirmationFields: { marginBottom: 10 },
  confirmationTerms: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 8,
  },
  confirmButtonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  backButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    marginLeft: 8,
  },
  backButtonText: { color: '#374151', fontWeight: '600', textAlign: 'center' },
  confirmationNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: '700',
  },
  statusMessage: { fontSize: 13, color: '#374151', marginBottom: 6 },
  statusProvider: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statusScheduled: { fontSize: 12, color: '#6b7280' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowLabel: { fontSize: 13, color: '#6b7280' },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  inputContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: {
    paddingHorizontal: 16,
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});
