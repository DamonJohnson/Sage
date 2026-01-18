import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { DiscoverScreen } from '@/screens/discover/DiscoverScreen';
import { LibraryScreen } from '@/screens/library/LibraryScreen';
import { CreateHubScreen } from '@/screens/create/CreateHubScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import type { MainTabParamList } from './types';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = 'home' | 'home-outline' | 'compass' | 'compass-outline' | 'library' | 'library-outline' | 'add-circle' | 'add-circle-outline' | 'person' | 'person-outline';

const TAB_ICONS: Record<keyof MainTabParamList, { focused: TabIconName; unfocused: TabIconName }> = {
  HomeTab: { focused: 'home', unfocused: 'home-outline' },
  DiscoverTab: { focused: 'compass', unfocused: 'compass-outline' },
  LibraryTab: { focused: 'library', unfocused: 'library-outline' },
  CreateTab: { focused: 'add-circle', unfocused: 'add-circle-outline' },
  ProfileTab: { focused: 'person', unfocused: 'person-outline' },
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { isDesktop, isTablet } = useResponsive();
  const { background, surface, border, textPrimary, textSecondary, accent } = useThemedColors();

  // Hide bottom tabs on desktop/tablet (use sidebar instead)
  const hideTabBar = isDesktop || isTablet;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: accent.orange,
        tabBarInactiveTintColor: textSecondary,
        tabBarStyle: hideTabBar ? { display: 'none' } : {
          backgroundColor: background,
          borderTopWidth: 1,
          borderTopColor: border,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 4 : 8,
          height: Platform.OS === 'ios' ? 80 + insets.bottom : 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{ tabBarLabel: 'Discover' }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen
        name="CreateTab"
        component={CreateHubScreen}
        options={{ tabBarLabel: () => null }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
