import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check, QrCode, Zap, Infinity, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRevenueCat } from '@/providers/RevenueCatProvider';

const FEATURES = [
  { icon: Infinity, text: 'Unlimited QR codes' },
  { icon: Zap, text: 'Instant generation & saving' },
  { icon: QrCode, text: 'Full scan history' },
  { icon: Star, text: 'Support indie development' },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentOffering, purchasePackage, restorePurchases } = useRevenueCat();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const packages = currentOffering?.availablePackages ?? [];

  const handlePurchase = async () => {
    if (packages.length === 0) return;
    const pkg = packages[selectedIndex];
    if (!pkg) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await purchasePackage(pkg);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored', 'Your Pro subscription has been restored!');
        router.back();
      } else {
        Alert.alert('No Subscription Found', 'We could not find an active subscription for your account.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const formatPrice = (pkg: any) => {
    const product = pkg.product;
    const price = product.priceString;
    const period = pkg.packageType;

    if (period === 'MONTHLY') return `${price}/month`;
    if (period === 'ANNUAL') return `${price}/year`;
    return price;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <QrCode size={48} color={Colors.accent} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>QR Code Genie Pro</Text>
          <Text style={styles.subtitle}>
            Unlock unlimited QR code creation
          </Text>
        </View>

        <View style={styles.featuresSection}>
          {FEATURES.map((feature, idx) => {
            const IconComp = feature.icon;
            return (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <IconComp size={18} color={Colors.accent} strokeWidth={2} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
                <Check size={16} color={Colors.accent} strokeWidth={3} />
              </View>
            );
          })}
        </View>

        {packages.length > 0 ? (
          <View style={styles.packagesSection}>
            {packages.map((pkg, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => {
                    setSelectedIndex(idx);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.packageRadio, isSelected && styles.packageRadioSelected]}>
                    {isSelected && <View style={styles.packageRadioDot} />}
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>
                      {pkg.packageType === 'ANNUAL' ? 'Yearly' : 'Monthly'}
                    </Text>
                    {pkg.packageType === 'ANNUAL' && (
                      <Text style={styles.packageBadge}>Best Value</Text>
                    )}
                  </View>
                  <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                    {formatPrice(pkg)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.loadingPackages}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.purchaseBtn, (isPurchasing || packages.length === 0) && styles.btnDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing || packages.length === 0}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.purchaseBtnText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          {isRestoring ? (
            <ActivityIndicator color={Colors.textTertiary} size="small" />
          ) : (
            <Text style={styles.restoreBtnText}>Restore Purchase</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless it is cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accentMuted,
    borderWidth: 2,
    borderColor: Colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  packagesSection: {
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 14,
  },
  packageCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentMuted,
  },
  packageRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageRadioSelected: {
    borderColor: Colors.accent,
  },
  packageRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  packageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  packageTitleSelected: {
    color: Colors.text,
  },
  packageBadge: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.accent,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  packagePriceSelected: {
    color: Colors.accent,
  },
  loadingPackages: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  purchaseBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  purchaseBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  restoreBtnText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  legalText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.7,
  },
});
