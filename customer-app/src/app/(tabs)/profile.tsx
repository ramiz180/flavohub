import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { useAuthStore } from '../../lib/store/auth.store';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

interface MenuRow {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { customer, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
            router.replace('/(auth)/login');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const name = customer?.name ?? 'Guest';
  const phone = customer?.phone ?? '';
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const menuRows: MenuRow[] = [
    {
      icon: '👤',
      label: 'Personal Details',
      onPress: () => Alert.alert('Coming soon', 'Personal details screen'),
    },
    {
      icon: '📍',
      label: 'Saved Addresses',
      onPress: () => Alert.alert('Coming soon', 'Saved addresses screen'),
    },
    {
      icon: '🛒',
      label: 'My Orders',
      onPress: () => router.push('/(tabs)/orders'),
    },
    {
      icon: '🔔',
      label: 'Notifications',
      onPress: () => Alert.alert('Coming soon', 'Notifications screen'),
    },
    {
      icon: '❓',
      label: 'Help Center',
      onPress: () => Alert.alert('Coming soon', 'Help center'),
    },
    {
      icon: '🔒',
      label: 'Privacy Policy',
      onPress: () => Alert.alert('Coming soon', 'Privacy policy'),
    },
  ];

  return (
    <SafeScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + name card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name}</Text>
            {phone ? <Text style={styles.profilePhone}>{phone}</Text> : null}
          </View>
        </View>

        {/* Menu list */}
        <View style={styles.menuCard}>
          {menuRows.map((row, index) => (
            <View key={row.label}>
              <TouchableOpacity style={styles.menuRow} onPress={row.onPress} activeOpacity={0.7}>
                <View style={styles.menuRowLeft}>
                  <Text style={styles.menuRowIcon}>{row.icon}</Text>
                  <Text style={[styles.menuRowLabel, row.danger && { color: colors.primary }]}>
                    {row.label}
                  </Text>
                </View>
                <Text style={styles.menuRowChevron}>›</Text>
              </TouchableOpacity>
              {index < menuRows.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.7}
          >
            <View style={styles.menuRowLeft}>
              {loggingOut ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ marginRight: space.md }}
                />
              ) : (
                <Text style={styles.menuRowIcon}>🚪</Text>
              )}
              <Text style={[styles.menuRowLabel, { color: colors.primary }]}>
                {loggingOut ? 'Logging out...' : 'Logout'}
              </Text>
            </View>
            <Text style={styles.menuRowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>FlavoHub v1.0 · Fresh Food Delivered Fast</Text>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerTitle: {
    ...type.title,
    color: colors.ink,
    textAlign: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: space.lg,
    borderRadius: radius.lg,
    padding: space.lg,
    ...cardShadow,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...type.h2,
    color: colors.surface,
  },
  profileInfo: {
    marginLeft: space.lg,
    flex: 1,
  },
  profileName: {
    ...type.h3,
    color: colors.ink,
  },
  profilePhone: {
    ...type.body,
    color: colors.muted,
    marginTop: space.xs,
  },
  menuCard: {
    backgroundColor: colors.surface,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...cardShadow,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    height: 56,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRowIcon: {
    fontSize: 20,
    width: 32,
  },
  menuRowLabel: {
    ...type.bodyMedium,
    color: colors.ink,
  },
  menuRowChevron: {
    fontSize: 20,
    color: colors.muted,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: space.lg + 32,
  },
  version: {
    ...type.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: space.md,
  },
});
