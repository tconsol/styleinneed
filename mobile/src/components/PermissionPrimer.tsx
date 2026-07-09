import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing, shadow } from '../theme';

export interface PrimerPoint {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

/**
 * Modern, branded permission-priming modal. Reusable for ANY OS permission
 * (location, camera, notifications, photos…). Shown before the OS dialog so
 * the user understands why. Renders above everything (Modal is top-most;
 * dark backdrop + high-elevation card).
 *
 * `onAllow` should perform the actual OS request (e.g. requestForegroundPermissionsAsync).
 */
export default function PermissionPrimer({
  visible,
  icon,
  title,
  body,
  points,
  allowLabel = 'Allow',
  onAllow,
  onSkip,
}: {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  points: PrimerPoint[];
  allowLabel?: string;
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadow.card]}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.points}>
            {points.map((p) => (
              <View key={p.text} style={styles.point}>
                <View style={styles.pointIcon}><Ionicons name={p.icon} size={15} color={colors.primary} /></View>
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.allowBtn} onPress={onAllow}>
            <Ionicons name={icon} size={18} color={colors.white} />
            <Text style={styles.allowText}>{allowLabel}</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.white, borderRadius: radii.xxl, padding: spacing.xl, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  points: { alignSelf: 'stretch', gap: 12, marginTop: spacing.xl, marginBottom: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pointText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text, flex: 1 },
  allowBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 15 },
  allowText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.white },
  skipBtn: { paddingVertical: 14 },
  skipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.muted },
});
