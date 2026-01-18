import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

import { RadiatingLogo } from '@/components/ui';

// Official Google "G" Logo
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import {
  useGoogleAuth,
  signInWithGoogleAccessToken,
  signUpWithEmail,
  signInWithEmail,
  performAppleSignIn,
  isAppleSignInAvailable,
} from '@/services';
import { spacing, typography, borderRadius, shadows } from '@/theme';

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

interface LoginScreenProps {
  initialIsSignUp?: boolean;
  onBack?: () => void;
}

export function LoginScreen({ initialIsSignUp = true, onBack }: LoginScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { updateUser, devLogin, isLoading, authError, clearError } = useAuthStore();
  const { background, surface, textPrimary, textSecondary, accent, border } = useThemedColors();
  const { isDesktop, isTablet } = useResponsive();

  const [appleAvailable, setAppleAvailable] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Google Auth hook
  const { request: googleRequest, response: googleResponse, promptAsync: promptGoogleAsync } = useGoogleAuth();

  // Check Apple availability
  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Handle Google auth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        handleGoogleAccessToken(authentication.accessToken);
      }
    } else if (googleResponse?.type === 'error') {
      console.error('Google auth error:', googleResponse.error);
    }
  }, [googleResponse]);

  const handleGoogleAccessToken = async (accessToken: string) => {
    setIsSigningIn(true);
    clearError();
    try {
      const response = await signInWithGoogleAccessToken(accessToken);
      if (response.success && response.data) {
        // Update auth store with Google user data, including isNewUser flag from backend
        const { setAuthenticated } = useAuthStore.getState();
        setAuthenticated(response.data.user, response.data.isNewUser || false);
      }
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const containerWidth = isDesktop ? 400 : isTablet ? 360 : '100%';

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    clearError();

    if (googleRequest) {
      // Use proper OAuth flow
      await promptGoogleAsync();
    } else {
      // Fallback to dev login if OAuth not configured
      setIsSigningIn(true);
      await devLogin();
      setIsSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    clearError();
    setIsSigningIn(true);

    try {
      const credential = await performAppleSignIn();
      if (credential) {
        // TODO: Handle Apple sign in
      }
    } catch (error) {
      console.error('Apple sign in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDevLogin = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    clearError();
    setIsSigningIn(true);
    await devLogin();
    setIsSigningIn(false);
  };

  const handleEmailAuth = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFormError('');

    // Email validation
    if (!email.trim()) {
      setFormError('Please enter your email');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setFormError('Please enter a valid email address');
      return;
    }

    // Password validation
    if (!password.trim()) {
      setFormError('Please enter your password');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    // Sign up specific validation
    if (isSignUp) {
      if (password !== confirmPassword) {
        setFormError('Passwords do not match');
        return;
      }
    }

    setIsSigningIn(true);
    try {
      let response;
      if (isSignUp) {
        response = await signUpWithEmail(email.trim(), password);
      } else {
        response = await signInWithEmail(email.trim(), password);
      }

      if (response.success && response.data) {
        const { setAuthenticated } = useAuthStore.getState();
        // For email auth, isNewUser is true when signing up, false when signing in
        setAuthenticated(response.data.user, response.data.isNewUser ?? isSignUp);
      } else {
        setFormError(response.error || 'Authentication failed');
      }
    } catch (error) {
      setFormError('An error occurred');
    } finally {
      setIsSigningIn(false);
    }
  };

  const loading = isLoading || isSigningIn;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + spacing[8],
              paddingBottom: insets.bottom + spacing[8],
              maxWidth: containerWidth,
            },
          ]}
        >
          {/* Back to Landing Button */}
          {onBack && (
            <TouchableOpacity
              style={styles.landingBackButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                onBack();
              }}
            >
              <Ionicons name="arrow-back" size={20} color={textSecondary} />
              <Text style={[styles.landingBackText, { color: textSecondary }]}>Back</Text>
            </TouchableOpacity>
          )}

          {/* Logo & Welcome */}
          <View style={styles.header}>
            <RadiatingLogo accentColor={accent.orange} />

            <Text style={[styles.title, { color: textPrimary }]}>
              {isSignUp ? 'Create an Account' : 'Welcome Back'}
            </Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              {isSignUp
                ? 'Start your learning journey with Sage'
                : 'Sign in to continue learning'}
            </Text>
          </View>

          {!showEmailForm ? (
            <>
              {/* Features - only show for sign up */}
              {isSignUp && (
                <View style={styles.features}>
                  {[
                    { icon: 'sparkles-outline', text: 'Build flashcards with AI' },
                    { icon: 'analytics-outline', text: 'Science-backed study methods' },
                    { icon: 'sync-outline', text: 'Sync Across Devices' },
                  ].map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons
                        name={feature.icon as any}
                        size={20}
                        color={accent.orange}
                      />
                      <Text style={[styles.featureText, { color: textSecondary }]}>
                        {feature.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Auth Buttons */}
              <View style={styles.authButtons}>
                {/* Google Sign In */}
                <TouchableOpacity
                  style={[styles.authButton, { backgroundColor: surface, borderColor: border }]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleLogo size={20} />
                  <Text style={[styles.authButtonText, { color: textPrimary }]}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Apple Sign In (iOS only) */}
                {appleAvailable && (
                  <TouchableOpacity
                    style={[styles.authButton, styles.appleButton]}
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  >
                    <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                    <Text style={[styles.authButtonText, { color: '#FFFFFF' }]}>
                      Continue with Apple
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Email Auth Button */}
                <TouchableOpacity
                  style={[styles.authButton, { backgroundColor: surface, borderColor: border }]}
                  onPress={() => setShowEmailForm(true)}
                  disabled={loading}
                >
                  <Ionicons name="mail-outline" size={20} color={textPrimary} />
                  <Text style={[styles.authButtonText, { color: textPrimary }]}>
                    {isSignUp ? 'Sign up with Email' : 'Sign in with Email'}
                  </Text>
                </TouchableOpacity>

                {/* Switch Mode Link */}
                <TouchableOpacity
                  style={styles.signInLink}
                  onPress={() => setIsSignUp(!isSignUp)}
                  disabled={loading}
                >
                  <Text style={[styles.signInLinkText, { color: textSecondary }]}>
                    {isSignUp ? (
                      <>Already have an account?{' '}
                        <Text style={{ color: accent.orange, fontWeight: '600' }}>Sign in</Text>
                      </>
                    ) : (
                      <>Don't have an account?{' '}
                        <Text style={{ color: accent.orange, fontWeight: '600' }}>Sign up</Text>
                      </>
                    )}
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: border }]} />
                  <Text style={[styles.dividerText, { color: textSecondary }]}>or</Text>
                  <View style={[styles.divider, { backgroundColor: border }]} />
                </View>

                {/* Demo Login */}
                <TouchableOpacity
                  style={[styles.authButton, styles.demoButton, { borderColor: accent.orange }]}
                  onPress={handleDevLogin}
                  disabled={loading}
                >
                  <Ionicons name="play-outline" size={20} color={accent.orange} />
                  <Text style={[styles.authButtonText, { color: accent.orange }]}>
                    Try Demo Mode
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Email Form */
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowEmailForm(false);
                  setFormError('');
                  setConfirmPassword('');
                }}
              >
                <Ionicons name="arrow-back" size={20} color={textSecondary} />
                <Text style={[styles.backButtonText, { color: textSecondary }]}>Back</Text>
              </TouchableOpacity>

              <Text style={[styles.formTitle, { color: textPrimary }]}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>

              <TextInput
                style={[styles.input, { backgroundColor: surface, borderColor: border, color: textPrimary }]}
                placeholder="Email address"
                placeholderTextColor={textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                style={[styles.input, { backgroundColor: surface, borderColor: border, color: textPrimary }]}
                placeholder={isSignUp ? "Password (min 6 characters)" : "Password"}
                placeholderTextColor={textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              {isSignUp && (
                <TextInput
                  style={[styles.input, { backgroundColor: surface, borderColor: border, color: textPrimary }]}
                  placeholder="Confirm password"
                  placeholderTextColor={textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              )}

              {!isSignUp && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => {
                    // TODO: Implement forgot password flow
                    if (Platform.OS === 'web') {
                      window.alert('Password reset functionality coming soon. Please contact support for assistance.');
                    } else {
                      // Could use Alert.alert for native
                      Linking.openURL('mailto:support@sage.app?subject=Password Reset Request');
                    }
                  }}
                >
                  <Text style={[styles.forgotPasswordText, { color: accent.orange }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              )}

              {formError ? (
                <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: accent.orange, borderColor: accent.orange }]}
                onPress={handleEmailAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.authButtonText, { color: '#FFFFFF' }]}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setFormError('');
                  setConfirmPassword('');
                }}
              >
                <Text style={[styles.switchModeText, { color: textSecondary }]}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <Text style={{ color: accent.orange, fontWeight: '600' }}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Indicator */}
          {loading && !showEmailForm && (
            <ActivityIndicator
              size="large"
              color={accent.orange}
              style={styles.loader}
            />
          )}

          {/* Error Message */}
          {authError && !showEmailForm && (
            <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          {/* Terms */}
          <Text style={[styles.terms, { color: textSecondary }]}>
            By continuing, you agree to our{' '}
            <Text
              style={{ color: accent.orange, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL('https://sage.app/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={{ color: accent.orange, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL('https://sage.app/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  landingBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
  },
  landingBackText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing[4],
  },
  features: {
    marginBottom: spacing[8],
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  featureText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[3],
  },
  authButtons: {
    width: '100%',
    maxWidth: 320,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.xl,
    marginBottom: spacing[3],
    borderWidth: 1,
    ...shadows.sm,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  demoButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  authButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    marginLeft: spacing[3],
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: spacing[4],
    fontSize: typography.sizes.sm,
  },
  loader: {
    marginTop: spacing[4],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[4],
    maxWidth: 320,
  },
  errorText: {
    color: '#EF4444',
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
    flex: 1,
  },
  terms: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing[8],
    paddingHorizontal: spacing[4],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  backButtonText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
  },
  formTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    marginBottom: spacing[6],
    textAlign: 'center',
  },
  input: {
    width: '100%',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    fontSize: typography.sizes.base,
    marginBottom: spacing[3],
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing[4],
    marginTop: -spacing[1],
  },
  forgotPasswordText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  switchModeButton: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: typography.sizes.sm,
  },
  signInLink: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  signInLinkText: {
    fontSize: typography.sizes.sm,
  },
});
