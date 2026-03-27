import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanLine, Flashlight, FlashlightOff, ExternalLink, Copy, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useQRHistory } from '@/providers/QRHistoryProvider';
import { normalizeUrl, looksLikeUrl } from '@/utils/qr';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [torch, setTorch] = useState<boolean>(false);
  const [CameraViewComponent, setCameraViewComponent] = useState<React.ComponentType<any> | null>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const { addScanned } = useQRHistory();

  useEffect(() => {
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const cameraModule = require('expo-camera');
        if (mounted && cameraModule.CameraView) {
          setCameraViewComponent(() => cameraModule.CameraView);
        }
        const permResult = cameraModule.Camera
          ? await cameraModule.Camera.requestCameraPermissionsAsync()
          : await cameraModule.requestCameraPermissionsAsync();
        if (mounted) setHasPermission(permResult.status === 'granted');
      } catch (e) {
        console.log('Camera init error:', e);
        if (mounted) setHasPermission(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  const handleBarCodeScanned = useCallback(({ data, type }: { data: string; type: string }) => {
    if (scannedData) return;
    setScannedData(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addScanned(data, type || 'qr');

    Animated.spring(resultAnim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scannedData, addScanned, resultAnim]);

  const handleOpenLink = useCallback(async () => {
    if (!scannedData) return;
    try {
      const url = looksLikeUrl(scannedData) ? normalizeUrl(scannedData) : scannedData;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', 'This content cannot be opened as a link.');
      }
    } catch (e) {
      console.log('Failed to open URL:', e);
    }
  }, [scannedData]);

  const handleCopy = useCallback(async () => {
    if (!scannedData) return;
    try {
      if (Platform.OS !== 'web') {
        const Clipboard = require('expo-clipboard');
        await Clipboard.setStringAsync(scannedData);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Copied', 'Content copied to clipboard');
    } catch (e) {
      console.log('Copy failed:', e);
    }
  }, [scannedData]);

  const handleDismiss = useCallback(() => {
    setScannedData(null);
    resultAnim.setValue(0);
  }, [resultAnim]);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  if (Platform.OS === 'web' || hasPermission === false) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.webFallback}>
          <View style={styles.fallbackIcon}>
            <ScanLine size={48} color={Colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.fallbackTitle}>Scanner Not Available</Text>
          <Text style={styles.fallbackText}>
            {Platform.OS === 'web'
              ? 'QR scanning requires the mobile app. Open this app on your phone to scan QR codes.'
              : 'Camera permission is required to scan QR codes. Please enable it in your device settings.'}
          </Text>
        </View>
      </View>
    );
  }

  if (hasPermission === null || !CameraViewComponent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.webFallback}>
          <Text style={styles.fallbackTitle}>Loading Camera...</Text>
        </View>
      </View>
    );
  }

  const CameraEl = CameraViewComponent;

  return (
    <View style={styles.container}>
      <CameraEl
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
        enableTorch={torch}
      />

      <View style={styles.overlayContainer}>
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.scanTitle}>Scan QR Code</Text>
          <TouchableOpacity
            style={styles.torchBtn}
            onPress={() => {
              setTorch(prev => !prev);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            {torch ? (
              <Flashlight size={22} color={Colors.accent} />
            ) : (
              <FlashlightOff size={22} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View
              style={[
                styles.scanAnimLine,
                { transform: [{ translateY: scanLineTranslate }] },
              ]}
            />
          </View>
          <Text style={styles.scanHint}>
            Point your camera at a QR code
          </Text>
        </View>
      </View>

      {scannedData && (
        <Animated.View
          style={[
            styles.resultSheet,
            { paddingBottom: insets.bottom + 20 },
            {
              opacity: resultAnim,
              transform: [{
                translateY: resultAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>QR Code Found</Text>
            <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.resultData} numberOfLines={3} selectable>
            {scannedData}
          </Text>
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.resultPrimaryBtn} onPress={handleOpenLink} activeOpacity={0.8}>
              <ExternalLink size={18} color={Colors.background} strokeWidth={2.5} />
              <Text style={styles.resultPrimaryText}>Open Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resultSecondaryBtn} onPress={handleCopy} activeOpacity={0.8}>
              <Copy size={18} color={Colors.accent} strokeWidth={2.5} />
              <Text style={styles.resultSecondaryText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_RADIUS = 4;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  torchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  scanAnimLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    top: '50%',
    backgroundColor: Colors.accent,
    opacity: 0.7,
    borderRadius: 1,
  },
  scanHint: {
    marginTop: 32,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  fallbackIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 15,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomWidth: 0,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultData: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  resultPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  resultPrimaryText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  resultSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentMuted,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  resultSecondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
});
