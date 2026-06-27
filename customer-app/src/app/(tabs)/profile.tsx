import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../lib/store/auth.store';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

interface MenuRow {
  icon: string;
  label: string;
  subLabel?: string;
  onPress: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const name = customer?.name ?? 'Guest User';
  const phone = customer?.phone ?? '+91 XXXXX XXXXX';

  const menuRowsFood: MenuRow[] = [
    {
      icon: '🍔',
      label: 'Your Orders',
      subLabel: 'Track, reorder, or get help',
      onPress: () => router.push('/(tabs)/orders'),
    },
    {
      icon: '❤️',
      label: 'Favorite Restaurants',
      subLabel: 'Your curated list of top spots',
      onPress: () => Alert.alert('Coming soon', 'Favorite Restaurants'),
    },
    {
      icon: '🎫',
      label: 'Offers & Promos',
      subLabel: 'Coupons curated for you',
      onPress: () => Alert.alert('Coming soon', 'Coupons screen'),
    },
  ];

  const menuRowsAccount: MenuRow[] = [
    {
      icon: '👤',
      label: 'Personal Details',
      onPress: () => Alert.alert('Coming soon', 'Personal details screen'),
    },
    {
      icon: '📍',
      label: 'Saved Addresses',
      onPress: () => router.push('/addresses'),
    },
    {
      icon: '⚙️',
      label: 'Settings',
      onPress: () => Alert.alert('Coming soon', 'Settings screen'),
    },
  ];

  const menuRowsOther: MenuRow[] = [
    {
      icon: '🎧',
      label: 'Help & Support',
      onPress: () => Alert.alert('Coming soon', 'Help center'),
    },
    {
      icon: '📄',
      label: 'Terms & Privacy',
      onPress: () => Alert.alert('Coming soon', 'Privacy policy'),
    },
  ];

  const renderMenuCard = (rows: MenuRow[]) => (
    <View style={styles.menuCard}>
      {rows.map((row, index) => (
        <View key={row.label}>
          <TouchableOpacity style={styles.menuRow} onPress={row.onPress} activeOpacity={0.7}>
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIconWrap}>
                 <Text style={styles.menuRowIcon}>{row.icon}</Text>
              </View>
              <View>
                 <Text style={[styles.menuRowLabel, row.danger && { color: colors.danger }]}>
                   {row.label}
                 </Text>
                 {row.subLabel && <Text style={styles.menuRowSub}>{row.subLabel}</Text>}
              </View>
            </View>
            <Text style={styles.menuRowChevron}>›</Text>
          </TouchableOpacity>
          {index < rows.length - 1 && <View style={styles.rowDivider} />}
        </View>
      ))}
    </View>
  );

  return (
    <SafeScreen edges={['top']}>
      {/* Background Gradient */}
      <LinearGradient colors={[colors.primaryTint, colors.surfaceAlt, colors.surfaceAlt]} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient colors={['#FF8A00', '#E52E71']} style={styles.avatarGradient}>
             <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200` }} style={styles.avatarImg} />
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profilePhone}>{phone}</Text>
            <TouchableOpacity style={styles.editBtn}>
               <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
           <View style={styles.statBox}>
              <Text style={styles.statVal}>12</Text>
              <Text style={styles.statLabel}>Orders</Text>
           </View>
           <View style={styles.statDivider} />
           <View style={styles.statBox}>
              <Text style={styles.statVal}>4</Text>
              <Text style={styles.statLabel}>Favorites</Text>
           </View>
           <View style={styles.statDivider} />
           <View style={styles.statBox}>
              <Text style={styles.statVal}>₹450</Text>
              <Text style={styles.statLabel}>Saved</Text>
           </View>
        </View>

        <Text style={styles.sectionTitle}>Food & Orders</Text>
        {renderMenuCard(menuRowsFood)}

        <Text style={styles.sectionTitle}>Account</Text>
        {renderMenuCard(menuRowsAccount)}

        <Text style={styles.sectionTitle}>More</Text>
        {renderMenuCard(menuRowsOther)}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
               <Text style={styles.logoutIcon}>🚪</Text>
               <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
           <Text style={styles.footerLogo}>FLAVOHUB</Text>
           <Text style={styles.version}>Version 1.0.0 (Premium)</Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.lg,
  },
  header: {
    paddingVertical: space.md,
    alignItems: 'center',
  },
  headerTitle: {
    ...type.h2,
    color: colors.ink,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    marginTop: space.sm,
    marginBottom: space.lg,
    ...cardShadow,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3, // For border effect
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    marginLeft: space.lg,
    flex: 1,
  },
  profileName: {
    ...type.h2,
    fontSize: 22,
    color: colors.ink,
  },
  profilePhone: {
    ...type.bodyMedium,
    color: colors.muted,
    marginTop: 2,
  },
  editBtn: {
    marginTop: space.sm,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  editBtnText: {
    ...type.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: space.md,
    marginBottom: space.lg,
    ...cardShadow,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    ...type.h2,
    color: colors.ink,
  },
  statLabel: {
    ...type.caption,
    color: colors.muted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: space.sm,
  },
  sectionTitle: {
    ...type.h3,
    color: colors.ink,
    marginBottom: space.sm,
    marginTop: space.xs,
  },
  menuCard: {
    backgroundColor: colors.surface,
    marginBottom: space.xl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...cardShadow,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 64,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  menuRowIcon: {
    fontSize: 20,
  },
  menuRowLabel: {
    ...type.h3,
    fontSize: 16,
    color: colors.ink,
  },
  menuRowSub: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  menuRowChevron: {
    fontSize: 24,
    color: colors.muted,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: space.lg + 56, // Align with text
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.xl,
    height: 56,
    marginTop: space.md,
    ...cardShadow,
    shadowColor: colors.danger,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: space.sm,
  },
  logoutText: {
    ...type.button,
    color: colors.surface,
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: space.xxl,
    marginBottom: space.md,
  },
  footerLogo: {
    ...type.display,
    fontSize: 18,
    color: colors.border,
    letterSpacing: 2,
  },
  version: {
    ...type.caption,
    color: colors.muted,
    marginTop: 4,
  },
});
