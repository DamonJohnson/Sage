import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Sidebar } from '@/components/navigation/Sidebar';
import { useResponsive } from '@/hooks/useResponsive';
import { colors } from '@/theme/colors';

interface DesktopLayoutProps {
  children: React.ReactNode;
  hideOnStudy?: boolean;
}

export function DesktopLayout({ children, hideOnStudy = true }: DesktopLayoutProps) {
  const { isDesktop, isTablet } = useResponsive();
  const navigation = useNavigation<any>();
  const route = useRoute();

  // Hide sidebar on study mode for immersive experience
  const isStudyMode = route.name === 'Study';
  const showSidebar = (isDesktop || isTablet) && !(hideOnStudy && isStudyMode);

  const handleNavigate = (routeName: string) => {
    // Map sidebar routes to actual navigation routes
    const routeMap: Record<string, string> = {
      Dashboard: 'Main',
      Library: 'Main',
      Social: 'Social',
      CreateHub: 'Main',
      Settings: 'Settings',
      Profile: 'Main',
      Statistics: 'Statistics',
      DailyReview: 'Main',
      DueCards: 'Main',
    };

    const tabMap: Record<string, string> = {
      Dashboard: 'HomeTab',
      Library: 'LibraryTab',
      CreateHub: 'CreateTab',
      Profile: 'ProfileTab',
      DailyReview: 'HomeTab',
      DueCards: 'HomeTab',
    };

    const targetRoute = routeMap[routeName] || routeName;
    const targetTab = tabMap[routeName];

    if (targetRoute === 'Main' && targetTab) {
      // Navigate to main and specific tab
      navigation.navigate('Main', { screen: targetTab });
    } else {
      navigation.navigate(targetRoute);
    }
  };

  // Get current route for sidebar highlighting
  const getCurrentRoute = (): string => {
    if (route.name === 'Main') {
      // Get the tab route from params
      const state = navigation.getState?.();
      const mainRoute = state?.routes?.find((r: any) => r.name === 'Main');
      const tabRoute = mainRoute?.state?.routes?.[mainRoute?.state?.index || 0];

      switch (tabRoute?.name) {
        case 'HomeTab':
          return 'Dashboard';
        case 'LibraryTab':
          return 'Library';
        case 'CreateTab':
          return 'CreateHub';
        case 'ProfileTab':
          return 'Profile';
        default:
          return 'Dashboard';
      }
    }
    return route.name;
  };

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Sidebar
        currentRoute={getCurrentRoute()}
        onNavigate={handleNavigate}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    marginLeft: 260, // Sidebar width
    ...Platform.select({
      web: {
        marginLeft: 260,
      },
      default: {
        marginLeft: 0,
      },
    }),
  },
});
