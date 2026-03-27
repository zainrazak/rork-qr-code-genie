import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Download, Share2, X, QrCode, Check, Link2, FileText, Globe, ChevronDown, ChevronUp, Info, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { getQRCodeUrl, normalizeUrl, looksLikeUrl } from '@/utils/qr';
import { useQRHistory } from '@/providers/QRHistoryProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';

const GUIDE_ITEMS = [
  {
    icon: Globe,
    title: 'URLs & Links',
    desc: 'Paste any website URL, social profile, or online link — works instantly.',
    tag: 'Ready',
    tagColor: '#00D4AA',
  },
  {
    icon: FileText,
    title: 'Documents & Files',
    desc: 'Upload your PDF, menu, or resume to a free host (Google Drive, Dropbox) and paste the share link here.',
    tag: 'Hybrid',
    tagColor: '#F59E0B',
  },
  {
    icon: Link2,
    title: 'Plain Text',
    desc: 'Enter any text, email, phone number, or Wi-Fi config to encode directly into a QR code.',
    tag: 'Ready',
    tagColor: '#00D4AA',
  },
];

export default function GenerateScreen() {
  const [inputValue, setInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const { addToHistory } = useQRHistory();
  const { isPro, canCreateQR, freeUsesRemaining, recordUsage } = useRevenueCat();
  const router = useRouter();
  const guideHeight = useRef(new Animated.Value(0)).current;

  const qrOpacity = useRef(new Animated.Value(0)).current;
  const qrScale = useRef(new Animated.Value(0.85)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const hasContent = inputValue.trim().length > 0;

  const toggleGuide = useCallback(() => {
    const toValue = showGuide ? 0 : 1;
    setShowGuide(!showGuide);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(guideHeight, {
      toValue,
      friction: 10,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [showGuide, guideHeight]);

  useEffect(() => {
    if (hasContent) {
      Animated.parallel([
        Animated.timing(qrOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(qrScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(qrOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      qrScale.setValue(0.85);
    }
  }, [hasContent, qrOpacity, qrScale]);

  const showSuccess = useCallback(() => {
    setSaveSuccess(true);
    Animated.sequence([
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaveSuccess(false));
  }, [successOpacity]);

  const handleSave = useCallback(async () => {
    if (!hasContent) return;

    if (!canCreateQR) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.push('/paywall');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    const content = inputValue.trim();

    try {
      addToHistory(content);
      recordUsage();

      if (Platform.OS === 'web') {
        Linking.openURL(getQRCodeUrl(content, 800));
      } else {
        const MediaLibrary = require('expo-media-library');
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow photo library access to save QR codes.');
          setIsSaving(false);
          return;
        }

        const { File, Directory, Paths } = require('expo-file-system');
        const url = getQRCodeUrl(content, 800);
        const cacheDir = new Directory(Paths.cache, 'qr_codes');
        cacheDir.create({ idempotent: true });
        const downloadedFile = await File.downloadFileAsync(url, cacheDir, { idempotent: true });
        await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
        try { downloadedFile.delete(); } catch (_e) {}
      }

      showSuccess();
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [hasContent, inputValue, addToHistory, showSuccess]);

  const handleShare = useCallback(async () => {
    if (!hasContent) return;

    if (!canCreateQR) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.push('/paywall');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSharing(true);

    const raw = inputValue.trim();
    const content = looksLikeUrl(raw) ? normalizeUrl(raw) : raw;

    try {
      if (Platform.OS === 'web') {
        Linking.openURL(getQRCodeUrl(content, 800));
        return;
      }

      const Sharing = require('expo-sharing');
      const { File, Directory, Paths } = require('expo-file-system');

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available');
        return;
      }

      const url = getQRCodeUrl(content, 800);
      const cacheDir = new Directory(Paths.cache, 'qr_share');
      cacheDir.create({ idempotent: true });
      const downloadedFile = await File.downloadFileAsync(url, cacheDir, { idempotent: true });
      await Sharing.shareAsync(downloadedFile.uri);
      try { downloadedFile.delete(); } catch (_e) {}
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  }, [hasContent, inputValue]);

  const handleClear = useCallback(() => {
    setInputValue('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputSection}>
          <View style={styles.inputLabel}>
            <Link2 size={16} color={Colors.accent} />
            <Text style={styles.inputLabelText}>Enter URL or text</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="https://yourwebsite.com"
              placeholderTextColor={Colors.textTertiary}
              value={inputValue}
              onChangeText={setInputValue}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              selectionColor={Colors.accent}
              testID="qr-input"
            />
            {hasContent && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClear}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.guideToggle}
          onPress={toggleGuide}
          activeOpacity={0.7}
        >
          <View style={styles.guideToggleLeft}>
            <Info size={15} color={Colors.accent} />
            <Text style={styles.guideToggleText}>What can I turn into a QR code?</Text>
          </View>
          {showGuide ? (
            <ChevronUp size={18} color={Colors.textTertiary} />
          ) : (
            <ChevronDown size={18} color={Colors.textTertiary} />
          )}
        </TouchableOpacity>

        {showGuide && (
          <Animated.View
            style={[
              styles.guideContainer,
              {
                opacity: guideHeight,
              },
            ]}
          >
            {GUIDE_ITEMS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <View key={idx} style={styles.guideCard}>
                  <View style={styles.guideIconWrap}>
                    <IconComp size={18} color={Colors.accent} strokeWidth={2} />
                  </View>
                  <View style={styles.guideCardBody}>
                    <View style={styles.guideCardHeader}>
                      <Text style={styles.guideCardTitle}>{item.title}</Text>
                      <View style={[styles.guideTag, { backgroundColor: `${item.tagColor}18` }]}>
                        <View style={[styles.guideTagDot, { backgroundColor: item.tagColor }]} />
                        <Text style={[styles.guideTagText, { color: item.tagColor }]}>{item.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.guideCardDesc}>{item.desc}</Text>
                  </View>
                </View>
              );
            })}
            <View style={styles.guideTip}>
              <Text style={styles.guideTipText}>
                Tip: For Google Drive, click "Share" → "Anyone with the link" → copy the link. For Dropbox, use "Copy link". Paste it above!
              </Text>
            </View>
          </Animated.View>
        )}

        {!isPro && (
          <TouchableOpacity
            style={styles.usageBanner}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.7}
          >
            <View style={styles.usageBannerLeft}>
              <Crown size={16} color={canCreateQR ? '#F59E0B' : Colors.danger} />
              <Text style={styles.usageBannerText}>
                {canCreateQR
                  ? `${freeUsesRemaining} free QR code${freeUsesRemaining !== 1 ? 's' : ''} remaining`
                  : 'Free limit reached'}
              </Text>
            </View>
            <Text style={styles.usageBannerCta}>
              {canCreateQR ? 'Upgrade' : 'Go Pro'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.qrSection}>
          {hasContent ? (
            <Animated.View
              style={[
                styles.qrWrapper,
                { opacity: qrOpacity, transform: [{ scale: qrScale }] },
              ]}
            >
              <View style={styles.qrCard}>
                <View style={styles.qrInner}>
                  <Image
                    source={{ uri: getQRCodeUrl(inputValue.trim(), 600) }}
                    style={styles.qrImage}
                    contentFit="contain"
                    transition={300}
                    testID="qr-image"
                  />
                </View>
                <View style={styles.qrFooter}>
                  <Text style={styles.qrUrl} numberOfLines={1} ellipsizeMode="middle">
                    {inputValue.trim()}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderCircle}>
                <QrCode size={40} color={Colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={styles.placeholderTitle}>Generate a QR Code</Text>
              <Text style={styles.placeholderText}>
                Enter any URL, text, or link above to create your QR code instantly
              </Text>
            </View>
          )}
        </View>

        {hasContent && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.primaryBtn, isSaving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
              testID="save-button"
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.background} size="small" />
              ) : (
                <>
                  <Download size={20} color={Colors.background} strokeWidth={2.5} />
                  <Text style={styles.primaryBtnText}>Save to Photos</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, isSharing && styles.btnDisabled]}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
              testID="share-button"
            >
              {isSharing ? (
                <ActivityIndicator color={Colors.accent} size="small" />
              ) : (
                <>
                  <Share2 size={20} color={Colors.accent} strokeWidth={2.5} />
                  <Text style={styles.secondaryBtnText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {saveSuccess && (
          <Animated.View style={[styles.successBanner, { opacity: successOpacity }]}>
            <Check size={18} color={Colors.accent} strokeWidth={3} />
            <Text style={styles.successText}>Saved to Photos & History</Text>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputSection: {
    marginBottom: 28,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 54,
    fontSize: 16,
    color: Colors.text,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  qrWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    width: 280,
  },
  qrInner: {
    padding: 24,
    alignItems: 'center',
  },
  qrImage: {
    width: 232,
    height: 232,
  },
  qrFooter: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  qrUrl: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  placeholderCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  actionsSection: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentMuted,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    gap: 10,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  successText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guideToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  guideContainer: {
    marginBottom: 20,
    gap: 10,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  guideIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCardBody: {
    flex: 1,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  guideCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  guideTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  guideTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  guideTagText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  guideCardDesc: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 19,
  },
  guideTip: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  guideTipText: {
    fontSize: 13,
    color: '#F59E0B',
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  usageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  usageBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  usageBannerCta: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
});
