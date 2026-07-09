import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../src/theme';
import { useCart, cartTotals } from '../../src/api/cart';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TABS = [
  { name: 'index',      label: 'Home',       icon: 'home',     iconOutline: 'home-outline' },
  { name: 'categories', label: 'Categories', icon: 'grid',     iconOutline: 'grid-outline' },
  { name: 'orders',     label: 'Orders',     icon: 'cube',     iconOutline: 'cube-outline' },
  { name: 'cart',       label: 'Bag',        icon: 'bag',      iconOutline: 'bag-outline' },
  { name: 'profile',    label: 'Profile',    icon: 'person',   iconOutline: 'person-outline' },
] as const;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: cart } = useCart();
  const { count: cartCount } = cartTotals(cart);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, idx) => {
        if (!route) return null;
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const badge = tab.name === 'cart' ? cartCount : 0;
        const focused = state.index === idx;

        return (
          <Pressable
            key={route.key}
            style={styles.tab}
            onPress={() => navigation.navigate(route.name)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={(focused ? tab.icon : tab.iconOutline) as keyof typeof Ionicons.glyphMap}
                size={22}
                color={focused ? colors.primary : colors.muted}
              />
              {badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>
              {tab.label}
            </Text>
            {focused && <View style={styles.activeDot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 8,
    color: colors.white,
    lineHeight: 12,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontFamily: fonts.bodySemibold,
    color: colors.primary,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 1,
  },
});
