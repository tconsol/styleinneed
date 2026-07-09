import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  ctaText?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon, title, subtitle, ctaText, onCta }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.iconRing}>
        <View style={s.iconInner}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
      </View>
      <Text style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {!!ctaText && (
        <Pressable style={s.cta} onPress={onCta}>
          <Text style={s.ctaText}>{ctaText}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
    lineHeight: 20,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    backgroundColor: colors.textSecondary,
    borderRadius: radii.xs,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  ctaText: {
    fontFamily: fonts.bodySemibold,
    color: colors.white,
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
