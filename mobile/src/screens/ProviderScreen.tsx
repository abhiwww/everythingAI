/**
 * Provider portal screen.
 * Shows pending job requests that the provider can accept or decline.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../api';

export default function ProviderScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.admin.requests(); // reuses admin endpoint for provider queue
      if (res.ok) {
        const data = await res.json();
        setRequests((data.requests || []).filter((r: any) => r.status === 'provider_pending'));
      }
    } catch {
      Alert.alert('Error', 'Unable to load job requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (bookingId: string, action: 'accept' | 'decline') => {
    try {
      const res = action === 'accept' ? await api.bookings.accept(bookingId) : await api.bookings.decline(bookingId);
      if (res.ok) {
        loadRequests();
      } else {
        const err = await res.json();
        Alert.alert('Failed', err.message || `Could not ${action} booking`);
      }
    } catch {
      Alert.alert('Error', `Could not ${action} booking`);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <Text style={styles.requestCustomer}>{item.customer_email}</Text>
        <Text style={styles.requestDetail}>
          {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : '—'}
        </Text>
        <Text style={styles.requestTotal}>₹{item.total}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacityPressable
          onPress={() => handleAction(item.id, 'accept')}
          style={styles.acceptButton}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacityPressable>
        <TouchableOpacityPressable
          onPress={() => handleAction(item.id, 'decline')}
          style={styles.declineButton}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacityPressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f2937" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Requests</Text>
        <Text style={styles.headerSubtitle}>
          Review and accept or decline incoming booking requests.
        </Text>
      </View>

      {requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No pending job requests.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  listContent: { padding: 12 },
  requestItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestInfo: { flex: 1 },
  requestCustomer: { fontSize: 14, fontWeight: '700', color: '#111827' },
  requestDetail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  requestTotal: { fontSize: 14, fontWeight: '800', color: '#111827', marginTop: 4 },
  requestActions: { gap: 8 },
  acceptButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  declineButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// TouchableOpacityPressable alias for clarity
const TouchableOpacityPressable = require('react-native').TouchableOpacity;
