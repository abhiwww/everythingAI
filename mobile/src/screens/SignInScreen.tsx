/**
 * Sign-in / Register screen.
 * Customers and providers can register or log in.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: any) => {
    e?.preventDefault?.();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.auth.login({ email, password });
      if (res.ok) {
        const data = await res.json();
        signIn(data.token, data.user);
      } else {
        const err = await res.json();
        setError(err.message || 'Login failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e?: any) => {
    e?.preventDefault?.();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.auth.register({ email, password, role });
      if (res.ok) {
        const data = await res.json();
        signIn(data.token, data.user);
      } else {
        const err = await res.json();
        setError(err.message || 'Registration failed');
      }
    } catch {
      setError('Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Everyday AI</Text>
        <Text style={styles.subtitle}>
          Your personal assistant for everyday services in Bengaluru
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>I am a</Text>
          <TouchableOpacity
            style={[styles.rolePicker, role === 'customer' ? styles.roleActive : null]}
            onPress={() => setRole('customer')}
          >
            <Text style={[styles.roleText, role === 'customer' ? styles.roleActiveText : null]}>
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rolePicker, role === 'provider' ? styles.roleActive : null]}
            onPress={() => setRole('provider')}
          >
            <Text style={[styles.roleText, role === 'provider' ? styles.roleActiveText : null]}>
              Provider
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleLogin}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonOutline} onPress={handleRegister}>
          <Text style={styles.buttonTextOutline}>Register</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Demo mode — sample data only. No real bookings or payments.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  rolePicker: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  roleActive: {
    borderColor: '#1f2937',
    backgroundColor: '#f3f4f6',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  roleActiveText: {
    color: '#111827',
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: '#1f2937',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonOutline: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonTextOutline: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
