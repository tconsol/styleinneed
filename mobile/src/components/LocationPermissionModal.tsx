import * as Location from 'expo-location';
import PermissionPrimer from './PermissionPrimer';

/**
 * Location-specific wrapper around the reusable PermissionPrimer.
 * Primes the user, then fires the OS location dialog on Allow.
 */
export default function LocationPermissionModal({
  visible, onResult, onSkip,
}: {
  visible: boolean;
  onResult: (granted: boolean) => void;
  onSkip: () => void;
}) {
  const allow = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    onResult(status === 'granted');
  };

  return (
    <PermissionPrimer
      visible={visible}
      icon="location"
      title="Enable Location"
      body="Allow Style In Need to access your location to detect your delivery address and show nearby options. You can change this anytime."
      allowLabel="Allow Location"
      points={[
        { icon: 'navigate-outline', text: 'Auto-detect your delivery address' },
        { icon: 'time-outline', text: 'Faster, accurate checkout' },
        { icon: 'lock-closed-outline', text: 'Only used while you shop' },
      ]}
      onAllow={allow}
      onSkip={onSkip}
    />
  );
}
