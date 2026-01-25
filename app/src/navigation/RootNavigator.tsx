import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TabNavigator } from './TabNavigator';
import { StudyScreen } from '@/screens/study/StudyScreen';
import { DeckDetailScreen } from '@/screens/library/DeckDetailScreen';
import { CreateManualScreen } from '@/screens/create/CreateManualScreen';
import { CreateAIScreen } from '@/screens/create/CreateAIScreen';
import { CreatePDFScreen } from '@/screens/create/CreatePDFScreen';
import { CreateImageScreen } from '@/screens/create/CreateImageScreen';
import { CreateImportScreen } from '@/screens/create/CreateImportScreen';
import { AddCardsPreviewScreen } from '@/screens/create/AddCardsPreviewScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { StatisticsScreen } from '@/screens/profile/StatisticsScreen';
import { AchievementsScreen } from '@/screens/profile/AchievementsScreen';
import { HelpScreen } from '@/screens/profile/HelpScreen';
import { ContactScreen } from '@/screens/profile/ContactScreen';
import { PrivacyPolicyScreen } from '@/screens/profile/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '@/screens/profile/TermsOfServiceScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { PublicDeckPreviewScreen } from '@/screens/discover/PublicDeckPreviewScreen';
import { SocialScreen, UserProfileScreen } from '@/screens/social';
import { ReviewScreen } from '@/screens/review';
import { LandingScreen, LoginScreen, ProfileSetupScreen } from '@/screens/auth';
import { Sidebar } from '@/components/navigation/Sidebar';
import { OnboardingModal } from '@/components/onboarding';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore, useDeckStore } from '@/store';
import { syncStudyHistory } from '@/services';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  const { background } = useThemedColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="Study"
        component={StudyScreen}
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="DeckDetail" component={DeckDetailScreen} />
      <Stack.Screen name="CreateManual" component={CreateManualScreen} />
      <Stack.Screen name="CreateAI" component={CreateAIScreen} />
      <Stack.Screen name="CreatePDF" component={CreatePDFScreen} />
      <Stack.Screen name="CreateImage" component={CreateImageScreen} />
      <Stack.Screen name="CreateImport" component={CreateImportScreen} />
      <Stack.Screen name="AddCardsPreview" component={AddCardsPreviewScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="PublicDeckPreview" component={PublicDeckPreviewScreen} />
      <Stack.Screen name="Social" component={SocialScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
    </Stack.Navigator>
  );
}

function ResponsiveLayout({ children, navigationRef }: { children: React.ReactNode; navigationRef: any }) {
  const { isDesktop, isTablet } = useResponsive();
  const { background } = useThemedColors();
  const showSidebar = isDesktop || isTablet;

  const handleNavigate = (routeName: string) => {
    if (!navigationRef.current) return;

    const tabMap: Record<string, string> = {
      Dashboard: 'HomeTab',
      Discover: 'DiscoverTab',
      Library: 'LibraryTab',
      CreateHub: 'CreateTab',
      Profile: 'ProfileTab',
      Review: 'HomeTab',
    };

    const stackRoutes = ['Settings', 'Statistics', 'Study', 'Social', 'Review'];

    if (stackRoutes.includes(routeName)) {
      navigationRef.current.navigate(routeName);
    } else if (tabMap[routeName]) {
      navigationRef.current.navigate('Main', { screen: tabMap[routeName] });
    }
  };

  const getCurrentRoute = (): string => {
    if (!navigationRef.current) return 'Dashboard';

    const state = navigationRef.current.getRootState?.();
    if (!state) return 'Dashboard';

    const currentRoute = state.routes[state.index];

    if (currentRoute.name === 'Main') {
      const tabState = currentRoute.state;
      if (tabState) {
        const tabRoute = tabState.routes[tabState.index || 0];
        switch (tabRoute?.name) {
          case 'HomeTab': return 'Dashboard';
          case 'DiscoverTab': return 'Discover';
          case 'LibraryTab': return 'Library';
          case 'CreateTab': return 'CreateHub';
          case 'ProfileTab': return 'Profile';
        }
      }
      return 'Dashboard';
    }

    return currentRoute.name;
  };

  // Don't show sidebar in study mode
  const state = navigationRef.current?.getRootState?.();
  const isStudyMode = state?.routes?.[state?.index]?.name === 'Study';

  if (!showSidebar || isStudyMode) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
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

export function RootNavigator() {
  const navigationRef = React.useRef<any>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [showAuth, setShowAuth] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(true);
  const { isDark } = useTheme();
  const { background, textPrimary, border } = useThemedColors();
  const { isAuthenticated, needsProfileSetup, hasSeenOnboarding, checkAuthStatus, completeProfileSetup, completeOnboarding } = useAuthStore();
  const { loadDecks } = useDeckStore();

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated && !needsProfileSetup) {
      // Load decks from backend
      loadDecks().catch(console.error);
      // Sync study history
      syncStudyHistory().catch(console.error);
    }
  }, [isAuthenticated, needsProfileSetup]);

  // Reset auth view state when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setShowAuth(false);
    }
  }, [isAuthenticated]);

  // Custom navigation theme
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: background,
      card: background,
      text: textPrimary,
      border: border,
      primary: '#2383E2',
    },
  };

  // Handle navigation from landing to auth
  const handleSignUp = () => {
    setIsSignUp(true);
    setShowAuth(true);
  };

  const handleSignIn = () => {
    setIsSignUp(false);
    setShowAuth(true);
  };

  // Show landing or login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <NavigationContainer theme={navigationTheme}>
        {showAuth ? (
          <LoginScreen initialIsSignUp={isSignUp} onBack={() => setShowAuth(false)} />
        ) : (
          <LandingScreen onSignUp={handleSignUp} onSignIn={handleSignIn} />
        )}
      </NavigationContainer>
    );
  }

  // Show profile setup screen for new users
  if (needsProfileSetup) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <ProfileSetupScreen onComplete={completeProfileSetup} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={forceUpdate}
      theme={navigationTheme}
    >
      <ResponsiveLayout navigationRef={navigationRef}>
        <MainNavigator />
      </ResponsiveLayout>

      {/* Onboarding Modal for new users */}
      <OnboardingModal
        visible={!hasSeenOnboarding}
        onComplete={completeOnboarding}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    ...Platform.select({
      web: {
        marginLeft: 260,
      },
    }),
  },
});
