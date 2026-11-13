/**
 * Customer bookings list screen.
 * Shows customer's booking history with current status.
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
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await api.bookings.list();
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {
      Alert.alert('Error', 'Unable to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.bookingItem}>
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingStatus}>{item.status.replace('_', ' ')}</Text>
        <Text style={styles.bookingDate}>
          {item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : '—'}
        </Text>
        <Text style={styles.bookingTotal}>₹{item.total}</Text>
      </View>
      <View style={styles.bookingBadge}>
        {item.status === 'confirmed' ? 'CONFIRMED' : item.status === 'provider_pending' ? 'PENDING' : '—'}
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
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>
          {user?.email ? `Signed in as {user.email}` : ''}
        </Text>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No bookings yet.</Text>
          <Text style={styles.emptyHint}>Start a conversation to book a service.</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
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
  emptyText: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  listContent: { padding: 12 },
  bookingItem: {
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
  bookingInfo: { flex: 1 },
  bookingStatus: { fontSize: 13, fontWeight: '700', color: '#374151' },
  bookingDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  bookingTotal: { fontSize: 14, fontWeight: '800', color: '#111827', marginTop: 4 },
  bookingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
});
