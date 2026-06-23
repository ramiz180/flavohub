import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SectionList,
  Alert,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { StickyActionBar, ActionButton, QuantitySelector } from '../../components/ui/StickyActionBar';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { Restaurant, MenuCategory, MenuItem } from '../../lib/api';
import { getRestaurantById, getRestaurantMenu, addToCart, clearCart } from '../../lib/api';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

const { width } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCuisineEmoji = (cuisine: string): string => {
  const map: Record<string, string> = {
    American: '🍔',
    Italian: '🍕',
    Indian: '🍛',
    Chinese: '🥡',
    Japanese: '🍱',
    Mexican: '🌮',
    Thai: '🍜',
    Mediterranean: '🥗',
    Desserts: '🍰',
    Beverages: '☕',
    Biryani: '🍚',
    Pizza: '🍕',
    Burger: '🍔',
    Healthy: '🥗',
    Noodles: '🍜',
  };
  return map[cuisine] ?? '🍽️';
};

function computeIsOpenClient(
  hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>,
): { isOpen: boolean; closeTime: string | null } {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const dayOfWeek = ist.getUTCDay();
  const hhmm = `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;

  const todayHours = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours || todayHours.isClosed) return { isOpen: false, closeTime: null };
  const open = hhmm >= todayHours.openTime && hhmm <= todayHours.closeTime;
  return { isOpen: open, closeTime: todayHours.closeTime };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const cartBadgeScale = useRef(new Animated.Value(1)).current;
  const cartSlideY = useRef(new Animated.Value(200)).current;

  // Bottom Sheet State
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [selectedFood, setSelectedFood] = useState<MenuItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const snapPoints = useMemo(() => ['85%'], []);


  useEffect(() => {
    const load = async () => {
      try {
        const [rest, menuData] = await Promise.all([
          getRestaurantById(id),
          getRestaurantMenu(id),
        ]);
        setRestaurant(rest);
        setMenu(menuData);
      } catch {
        setError('Could not load restaurant. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    Animated.spring(cartSlideY, {
      toValue: cartCount > 0 ? 0 : 200,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, [cartCount]);

  const bumpCartBadge = () => {
    Animated.sequence([
      Animated.spring(cartBadgeScale, { toValue: 1.4, useNativeDriver: true, speed: 30 }),
      Animated.spring(cartBadgeScale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
  };

  const handleOpenFoodDetails = useCallback((item: MenuItem) => {
    setSelectedFood(item);
    setSelectedQuantity(1);
    bottomSheetModalRef.current?.present();
  }, []);

  const handleAddToCart = async (item: MenuItem, qty: number) => {
    if (!restaurantIsOpen) {
      Alert.alert('Restaurant Closed', 'This restaurant is currently closed. Please try again later.');
      return;
    }
    setAddingItem(item.id);
    try {
      const updatedCart = await addToCart(item.id, qty);
      const count = updatedCart.items.reduce((s, i) => s + i.quantity, 0);
      setCartCount(count);
      bumpCartBadge();
      bottomSheetModalRef.current?.dismiss();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add item to cart';
      if (msg.includes('one restaurant')) {
        Alert.alert(
          'Different restaurant',
          'Your cart has items from another restaurant. Clear your cart first?',
          [
            { text: 'Keep', style: 'cancel' },
            {
              text: 'Clear & Add',
              style: 'destructive',
              onPress: async () => {
                await clearCart();
                await addToCart(item.id, qty);
                setCartCount(qty);
                bumpCartBadge();
                bottomSheetModalRef.current?.dismiss();
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', 'Could not add item. Please try again.');
      }
    } finally {
      setAddingItem(null);
    }
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const price = parseInt(item.price, 10);
    const isAdding = addingItem === item.id;
    const disabled = isAdding || !item.isAvailable || !restaurantIsOpen;
    const foodImage = item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop';

    return (
      <TouchableOpacity 
        style={[styles.menuItem, !item.isAvailable && styles.menuItemUnavailable]} 
        onPress={() => handleOpenFoodDetails(item)}
        activeOpacity={0.9}
      >
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <Text style={styles.menuItemPrice}>₹{price}</Text>
          {!item.isAvailable && (
            <Text style={styles.unavailableTag}>Currently Unavailable</Text>
          )}
        </View>

        <View style={styles.menuItemRight}>
          <View style={styles.menuItemImage}>
             <Image source={{ uri: foodImage }} style={styles.menuItemImageInner} />
             {item.isAvailable && restaurantIsOpen && (
               <TouchableOpacity
                 style={styles.floatingAddBtn}
                 onPress={() => handleOpenFoodDetails(item)}
                 disabled={disabled}
               >
                 <Text style={styles.floatingAddBtnText}>ADD</Text>
               </TouchableOpacity>
             )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Restaurant not found'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  const sections = menu.map((cat) => ({
    title: cat.name,
    data: cat.items,
  }));

  const { isOpen: clientIsOpen, closeTime } = computeIsOpenClient(restaurant.hours ?? []);
  const restaurantIsOpen: boolean = restaurant.isOpen !== undefined ? restaurant.isOpen : clientIsOpen;
  
  const coverUrl = (restaurant as any).coverImageUrl || restaurant.logoUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop';
  const logoUrl = restaurant.logoUrl || 'https://ui-avatars.com/api/?name=' + restaurant.name + '&background=random';

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.headerAbsolute}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>❤️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderMenuItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        bounces={false}
        ListHeaderComponent={
          <View>
            <View style={styles.cover}>
               <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFillObject} />
               <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(18,24,38,1)']} style={StyleSheet.absoluteFillObject} />
               
               <View style={styles.coverContent}>
                 <Image source={{ uri: logoUrl }} style={styles.restLogo} />
                 <Text style={styles.restName}>{restaurant.name}</Text>
                 <Text style={styles.restTags}>{restaurant.cuisineType} • {restaurant.city}</Text>
                 
                 <View style={styles.metaRow}>
                   <View style={styles.metaBadge}>
                     <Text style={styles.metaIcon}>⭐</Text>
                     <Text style={styles.metaText}>4.5</Text>
                   </View>
                   <View style={styles.metaBadge}>
                     <Text style={styles.metaIcon}>🕐</Text>
                     <Text style={styles.metaText}>30-40 mins</Text>
                   </View>
                   <View style={[styles.metaBadge, { backgroundColor: restaurantIsOpen ? colors.success : colors.danger }]}>
                     <Text style={[styles.metaText, { color: '#FFF' }]}>{restaurantIsOpen ? 'Open Now' : 'Closed'}</Text>
                   </View>
                 </View>
               </View>
            </View>

            <View style={styles.infoSheet}>
              {restaurant.description && (
                <Text style={styles.restDesc}>{restaurant.description}</Text>
              )}
              
              <View style={styles.offerBanner}>
                <View style={styles.offerIconWrap}><Text style={styles.offerIcon}>🎟️</Text></View>
                <View style={{flex: 1}}>
                  <Text style={styles.offerTitle}>50% OFF up to ₹100</Text>
                  <Text style={styles.offerSub}>Use code FLAT50 | Above ₹300</Text>
                </View>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
      />

      <Animated.View style={[
        styles.floatingCartContainer,
        { 
          bottom: Math.max(insets.bottom, 12) + 12,
          transform: [{ translateY: cartSlideY }] 
        }
      ]}>
        <TouchableOpacity style={styles.floatingCartBtn} onPress={() => router.push('/(tabs)/cart')} activeOpacity={0.9}>
          <View>
            <Text style={styles.fcItems}>{cartCount} ITEM{cartCount !== 1 ? 'S' : ''}</Text>
            <Text style={styles.fcSub}>View your cart</Text>
          </View>
          <View style={styles.fcRight}>
            <Text style={styles.fcRightText}>Checkout ➔</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Food Details Bottom Sheet ───────────────────────────── */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
        backgroundStyle={{ backgroundColor: colors.surface, borderRadius: 24 }}
      >
        {selectedFood && (
          <View style={styles.sheetContainer}>
            <BottomSheetScrollView contentContainerStyle={styles.sheetScroll}>
              <View style={styles.sheetImageContainer}>
                <Image
                  source={{ uri: selectedFood.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop' }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
              <View style={styles.sheetContent}>
                <View style={styles.vegNonVegBadge}>
                  <View style={styles.vegDot} />
                </View>
                <Text style={styles.sheetTitle}>{selectedFood.name}</Text>
                <Text style={styles.sheetPrice}>₹{parseInt(selectedFood.price, 10)}</Text>
                <View style={styles.divider} />
                <Text style={styles.sheetDescHeading}>Description</Text>
                <Text style={styles.sheetDesc}>
                  {selectedFood.description || 'Delicious freshly prepared meal with premium ingredients.'}
                </Text>
              </View>
            </BottomSheetScrollView>

            {/* ── Sticky Footer (safe-area-aware, never overlaps) ── */}
            <StickyActionBar style={styles.sheetActionBar}>
              <QuantitySelector
                value={selectedQuantity}
                onDecrement={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                onIncrement={() => setSelectedQuantity((q) => q + 1)}
              />
              <ActionButton
                label={`Add Item · ₹${parseInt(selectedFood.price, 10) * selectedQuantity}`}
                onPress={() => handleAddToCart(selectedFood, selectedQuantity)}
                loading={addingItem === selectedFood.id}
                disabled={addingItem === selectedFood.id}
              />
            </StickyActionBar>
          </View>
        )}
      </BottomSheetModal>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerAbsolute: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row',
    gap: space.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  backBtnText: { fontSize: 24, color: colors.ink, marginTop: -4 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  iconText: { fontSize: 20 },
  cover: {
    height: 320,
    justifyContent: 'flex-end',
    padding: space.lg,
  },
  coverContent: {
    zIndex: 2,
  },
  restLogo: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: space.sm,
  },
  restName: {
    ...type.display,
    color: '#FFF',
    fontSize: 28,
  },
  restTags: {
    ...type.bodyMedium,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 4,
    marginBottom: space.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    gap: 4,
  },
  metaIcon: { fontSize: 12 },
  metaText: { ...type.caption, color: '#FFF', fontWeight: '700' },
  infoSheet: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  restDesc: {
    ...type.body,
    color: colors.muted,
    marginBottom: space.lg,
  },
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  offerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  offerIcon: { fontSize: 20 },
  offerTitle: { ...type.h3, color: colors.primary, fontSize: 15 },
  offerSub: { ...type.caption, color: colors.muted, marginTop: 2 },
  sectionHeader: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  sectionTitle: { ...type.h2, color: colors.ink },
  menuItem: {
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
    marginHorizontal: space.md,
    marginBottom: space.md,
    borderRadius: radius.lg,
    ...cardShadow,
  },
  menuItemUnavailable: { opacity: 0.5 },
  menuItemInfo: { flex: 1, marginRight: space.md },
  menuItemName: { ...type.h3, color: colors.ink, fontSize: 16 },
  menuItemDesc: { ...type.caption, color: colors.muted, marginTop: space.xs, lineHeight: 18 },
  menuItemPrice: { ...type.price, color: colors.ink, marginTop: space.sm },
  unavailableTag: {
    ...type.caption,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '700',
  },
  menuItemRight: { alignItems: 'center' },
  menuItemImage: {
    width: 110,
    height: 110,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuItemImageInner: { width: '100%', height: '100%', resizeMode: 'cover' },
  floatingAddBtn: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.md,
    ...cardShadow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  floatingAddBtnText: {
    ...type.button,
    color: colors.primary,
    fontSize: 14,
  },
  listContent: { paddingBottom: 100, backgroundColor: colors.surfaceAlt },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  errorText: { ...type.body, color: colors.danger, textAlign: 'center', marginBottom: space.md },
  backLink: { ...type.body, color: colors.primary, fontWeight: '600' },
  
  // Floating Cart Container
  floatingCartContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  floatingCartBtn: {
    backgroundColor: '#FF6B01',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 80,
    borderRadius: 24,
    ...cardShadow,
    shadowColor: '#FF6B01',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fcItems: { 
    ...type.h3, 
    color: '#FFF',
    marginBottom: 2,
  },
  fcSub: { 
    ...type.caption, 
    color: 'rgba(255,255,255,0.9)', 
    fontWeight: '600',
  },
  fcRight: { flexDirection: 'row', alignItems: 'center' },
  fcRightText: { ...type.h2, color: '#FFF' },

  // ── Bottom Sheet ──────────────────────────────────────────────────────────
  sheetContainer: {
    flex: 1,
  },
  sheetScroll: {
    paddingBottom: 96, // room for the sticky action bar
  },
  sheetActionBar: {
    // Override position so it sits inside the sheet, not the screen
    // StickyActionBar uses position:absolute by default which works perfectly
    // inside the sheet's flex container
  },
  sheetImageContainer: {
    width: '100%',
    height: 250,
  },
  sheetContent: {
    padding: space.lg,
  },
  vegNonVegBadge: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#00C47A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
    borderRadius: 2,
  },
  vegDot: {
    width: 8,
    height: 8,
    backgroundColor: '#00C47A',
    borderRadius: 4,
  },
  sheetTitle: {
    ...type.display,
    fontSize: 24,
    color: colors.ink,
  },
  sheetPrice: {
    ...type.h2,
    color: colors.ink,
    marginTop: space.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: space.lg,
  },
  sheetDescHeading: {
    ...type.h3,
    color: colors.ink,
    marginBottom: space.sm,
  },
  sheetDesc: {
    ...type.body,
    color: colors.muted,
    lineHeight: 22,
  },
});

