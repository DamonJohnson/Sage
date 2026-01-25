import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius } from '@/theme';

export function Footer() {
  const navigation = useNavigation();
  const { surface, border, textSecondary, accent } = useThemedColors();

  const currentYear = new Date().getFullYear();

  const handlePrivacyPress = () => {
    navigation.navigate('PrivacyPolicy' as never);
  };

  const handleTermsPress = () => {
    navigation.navigate('TermsOfService' as never);
  };

  const handleContactPress = () => {
    navigation.navigate('Contact' as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: surface, borderTopColor: border }]}>
      <View style={styles.links}>
        <TouchableOpacity onPress={handlePrivacyPress} style={styles.link}>
          <Text style={[styles.linkText, { color: textSecondary }]}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={[styles.divider, { color: textSecondary }]}>•</Text>
        <TouchableOpacity onPress={handleTermsPress} style={styles.link}>
          <Text style={[styles.linkText, { color: textSecondary }]}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={[styles.divider, { color: textSecondary }]}>•</Text>
        <TouchableOpacity onPress={handleContactPress} style={styles.link}>
          <Text style={[styles.linkText, { color: accent.orange }]}>Contact</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.copyright, { color: textSecondary }]}>
        © {currentYear} Sage. All rights reserved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    alignItems: 'center',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  link: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  linkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  divider: {
    fontSize: typography.sizes.sm,
  },
  copyright: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
});
