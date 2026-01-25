import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuthStore, useDeckStore } from '@/store';
import { RadiatingLogo } from '@/components/ui';
import * as Haptics from 'expo-haptics';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

function getNavSections(totalDueCards: number): NavSection[] {
  return [
    {
      items: [
        { id: 'Dashboard', label: 'Home', icon: 'home-outline' },
        { id: 'Library', label: 'Library', icon: 'library-outline' },
      ],
    },
    {
      title: 'Study',
      items: [
        { id: 'Review', label: 'Review', icon: 'refresh-outline', badge: totalDueCards > 0 ? totalDueCards : undefined },
        { id: 'Statistics', label: 'Statistics', icon: 'bar-chart-outline' },
      ],
    },
    {
      title: 'Community',
      items: [
        { id: 'Discover', label: 'Discover', icon: 'compass-outline' },
        { id: 'Social', label: 'Connections', icon: 'people-outline' },
      ],
    },
  ];
}

const bottomNavItems: NavItem[] = [
  { id: 'Settings', label: 'Settings', icon: 'settings-outline' },
  { id: 'Profile', label: 'Profile', icon: 'person-outline' },
];

// Inline NavItemButton with hover support
function NavItemButton({
  item,
  isActive,
  onPress,
  surfaceHover,
  textPrimary,
  textSecondary,
  accentColor,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
  surfaceHover: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const iconName = isActive ? item.icon.replace('-outline', '') as IconName : item.icon;

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onPress();
  }, [onPress]);

  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const webStyle = Platform.OS === 'web' ? {
    cursor: 'pointer',
    transition: 'background-color 150ms ease, transform 100ms ease',
  } as any : {};

  return (
    <TouchableOpacity
      style={[
        styles.navItem,
        { backgroundColor: isActive || isHovered ? surfaceHover : 'transparent' },
        webStyle,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      {...webProps}
    >
      <Ionicons
        name={iconName}
        size={18}
        color={isActive ? accentColor : isHovered ? textPrimary : textSecondary}
      />
      <Text
        style={[
          styles.navItemLabel,
          { color: isActive || isHovered ? textPrimary : textSecondary },
          isActive && styles.navItemLabelActive,
        ]}
      >
        {item.label}
      </Text>
      {item.badge !== undefined && (
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const { user, signOut } = useAuthStore();
  const { decks } = useDeckStore();
  const { isDark, toggleTheme } = useTheme();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [themeHovered, setThemeHovered] = useState(false);
  const [createHovered, setCreateHovered] = useState(false);
  const [userHovered, setUserHovered] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Calculate total due cards from all decks
  const totalDueCards = useMemo(() => {
    return decks.reduce((sum, deck) => sum + (deck.dueCount || 0), 0);
  }, [decks]);

  // Generate nav sections with actual due count
  const navSections = useMemo(() => getNavSections(totalDueCards), [totalDueCards]);

  const handleSignOut = async () => {
    setShowUserMenu(false);

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        await signOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await signOut();
            },
          },
        ]
      );
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = currentRoute === item.id;

    return (
      <NavItemButton
        key={item.id}
        item={item}
        isActive={isActive}
        onPress={() => onNavigate(item.id)}
        surfaceHover={surfaceHover}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentColor={accent.orange}
      />
    );
  };

  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer',
    transition: 'transform 150ms ease, background-color 150ms ease, box-shadow 150ms ease',
  } as any : {};

  return (
    <View style={[styles.container, { backgroundColor: background, borderRightColor: border }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <View style={styles.headerLeft}>
          <RadiatingLogo accentColor={accent.orange} size="small" />
          <Text style={[styles.logoText, { color: textPrimary }]}>Sage</Text>
        </View>

        {/* Theme Toggle */}
        <TouchableOpacity
          style={[
            styles.themeToggle,
            { backgroundColor: themeHovered ? surfaceHover : surface },
            webButtonStyle,
          ]}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.selectionAsync();
            }
            toggleTheme();
          }}
          activeOpacity={0.7}
          {...(Platform.OS === 'web' ? {
            onMouseEnter: () => setThemeHovered(true),
            onMouseLeave: () => setThemeHovered(false),
          } : {})}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={themeHovered ? textPrimary : textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[
          styles.createButton,
          { backgroundColor: accent.orange },
          webButtonStyle,
          createHovered && styles.createButtonHovered,
        ]}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onNavigate('CreateHub');
        }}
        activeOpacity={0.8}
        {...(Platform.OS === 'web' ? {
          onMouseEnter: () => setCreateHovered(true),
          onMouseLeave: () => setCreateHovered(false),
        } : {})}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.createButtonText}>Create Deck</Text>
      </TouchableOpacity>

      {/* Navigation */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {navSections.map((section, index) => (
          <View key={index} style={styles.navSection}>
            {section.title && (
              <Text style={[styles.sectionTitle, { color: textSecondary }]}>
                {section.title}
              </Text>
            )}
            {section.items.map(renderNavItem)}
          </View>
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { borderTopColor: border }]}>
        {bottomNavItems.map(renderNavItem)}

        {/* User Info */}
        {user && (
          <TouchableOpacity
            style={[
              styles.userInfo,
              { borderTopColor: border },
              userHovered && { backgroundColor: surfaceHover },
              webButtonStyle,
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync();
              }
              setShowUserMenu(true);
            }}
            activeOpacity={0.7}
            {...(Platform.OS === 'web' ? {
              onMouseEnter: () => setUserHovered(true),
              onMouseLeave: () => setUserHovered(false),
            } : {})}
          >
            <View style={[styles.userAvatar, { backgroundColor: accent.orange }]}>
              <Text style={styles.userAvatarText}>
                {user.name?.charAt(0) || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: textPrimary }]} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[styles.userEmail, { color: textSecondary }]} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <Ionicons name="chevron-up" size={16} color={textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={[styles.userMenu, { backgroundColor: surface, borderColor: border }]}>
            {/* User Header in Menu */}
            <View style={[styles.userMenuHeader, { borderBottomColor: border }]}>
              <View style={[styles.userAvatar, { backgroundColor: accent.orange }]}>
                <Text style={styles.userAvatarText}>
                  {user?.name?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: textPrimary }]} numberOfLines={1}>
                  {user?.name}
                </Text>
                <Text style={[styles.userEmail, { color: textSecondary }]} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            {/* Menu Options */}
            <TouchableOpacity
              style={styles.userMenuItem}
              onPress={() => {
                setShowUserMenu(false);
                onNavigate('Profile');
              }}
            >
              <Ionicons name="person-outline" size={20} color={textPrimary} />
              <Text style={[styles.userMenuItemText, { color: textPrimary }]}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userMenuItem}
              onPress={() => {
                setShowUserMenu(false);
                onNavigate('Settings');
              }}
            >
              <Ionicons name="settings-outline" size={20} color={textPrimary} />
              <Text style={[styles.userMenuItemText, { color: textPrimary }]}>Settings</Text>
            </TouchableOpacity>

            <View style={[styles.userMenuDivider, { backgroundColor: border }]} />

            <TouchableOpacity
              style={styles.userMenuItem}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color={accent.red} />
              <Text style={[styles.userMenuItemText, { color: accent.red }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    borderRightWidth: 1,
    height: '100%',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        left: 0,
        top: 0,
        bottom: 0,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
  },
  logoText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  themeToggle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[2],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
  },
  createButtonHovered: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createButtonText: {
    ...typography.variants.button,
    color: '#fff',
  },
  navScroll: {
    flex: 1,
  },
  navScrollContent: {
    paddingVertical: spacing[2],
  },
  navSection: {
    paddingHorizontal: spacing[3],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginLeft: spacing[3],
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[0.5],
  },
  navItemLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.regular,
    flex: 1,
  },
  navItemLabelActive: {
    fontWeight: typography.fontWeight.medium,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    color: '#fff',
    fontWeight: typography.fontWeight.medium,
  },
  bottomNav: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
    borderTopWidth: 1,
    paddingTop: spacing[3],
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: typography.sizes.base,
    color: '#fff',
    fontWeight: typography.fontWeight.medium,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  userEmail: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingLeft: spacing[3],
    paddingBottom: spacing[20],
  },
  userMenu: {
    width: 240,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  userMenuItemText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.regular,
  },
  userMenuDivider: {
    height: 1,
    marginHorizontal: spacing[4],
  },
});
