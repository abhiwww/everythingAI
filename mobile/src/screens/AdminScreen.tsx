/**
 * Admin console screen (admin / support roles only).
 * Provider verification, request queue, and audit trail.
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

export default function AdminScreen() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pRes, rRes, aRes] = await Promise.all([
        api.admin.providers(),
        api.admin.requests(),
        api.admin.audit(),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProviders(pData.providers || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRequests(rData.requests || []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAudit(aData.audit || []);
      }
    } catch {
      Alert.alert('Error', 'Unable to load admin data');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Admin Console</Text>
        <Text style={styles.headerSubtitle}>
          Provider verification, request queue, and audit trail.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard title="Providers" value={providers.length} color="#1f2937" />
        <StatCard title="Pending" value={requests.filter((r: any) => r.status === 'provider_pending').length} color="#d97706" />
        <StatCard title="Confirmed" value={requests.filter((r: any) => r.status === 'confirmed').length} color="#059669" />
        <StatCard title="Audit events" value={audit.length} color="#6b7280" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Provider Verification</Text>
        <FlatList
          data={providers}
          renderItem={({ item }) => (
            <View style={styles.providerRow}>
              <Text style={styles.providerName}>{item.display_name}</Text>
              <Text style={[styles.statusText, { color: item.verification_status === 'verified' ? '#059669' : '#d97706' }]}>
                {item.verification_status}
              </Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audit Trail (recent)</Text>
        <FlatList
          data={audit.slice(0, 10)}
          renderItem={({ item }) => (
            <View style={styles.auditRow}>
              <Text style={styles.auditAction}>{item.action}</Text>
              <Text style={styles.auditTime}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Signed in as</Text>
        <Text style={styles.adminUser}>{user?.email} ({user?.role})</Text>
      </View>
    </View>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopWidth: 4, borderTopColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '900', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  section: { backgroundColor: '#fff', marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    padding: 12,
    backgroundColor: '#f3f4f6',
  },
  listContent: { padding: 12 },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  providerName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  statusText: { fontSize: 12, fontWeight: '700' },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  auditAction: { fontSize: 13, color: '#374151', fontWeight: '600' },
  auditTime: { fontSize: 11, color: '#9ca3af' },
  adminUser: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    padding: 16,
  },
});
