import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Trash2,
  ExternalLink,
  Clock,
  QrCode,
  Link2,
  Type,
  Mail,
  Phone,
  Wifi,
  ChevronRight,
  ScanLine,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useQRHistory } from '@/providers/QRHistoryProvider';
import { QRCodeItem, ScannedQRCode } from '@/types/qr';
import { getQRCodeUrl, formatDate, normalizeUrl, looksLikeUrl } from '@/utils/qr';

type TabType = 'created' | 'scanned';

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  url: Link2,
  text: Type,
  email: Mail,
  phone: Phone,
  wifi: Wifi,
};

function CreatedItem({ item, onDelete }: { item: QRCodeItem; onDelete: (id: string) => void }) {
  const IconComponent = TYPE_ICONS[item.type] || QrCode;

  const handlePress = useCallback(() => {
    if (item.type === 'url') {
      const url = looksLikeUrl(item.content) ? normalizeUrl(item.content) : item.content;
      Linking.openURL(url).catch(() => {});
    }
  }, [item]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete QR Code', 'Remove this from your history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }, [item.id, onDelete]);

  return (
    <TouchableOpacity style={styles.historyCard} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.cardThumb}>
        <Image
          source={{ uri: getQRCodeUrl(item.content, 120) }}
          style={styles.thumbImage}
          contentFit="contain"
        />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTypeRow}>
          <View style={styles.typeBadge}>
            <IconComponent size={12} color={Colors.accent} />
            <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.cardTime}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.cardContent} numberOfLines={2}>
          {item.content}
        </Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Trash2 size={16} color={Colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function ScannedItem({ item, onDelete }: { item: ScannedQRCode; onDelete: (id: string) => void }) {
  const handlePress = useCallback(async () => {
    try {
      const url = looksLikeUrl(item.data) ? normalizeUrl(item.data) : item.data;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.log('Cannot open URL:', e);
    }
  }, [item.data]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Scan', 'Remove this from your scans?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }, [item.id, onDelete]);

  return (
    <TouchableOpacity style={styles.historyCard} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.scanIcon}>
        <ScanLine size={20} color={Colors.accent} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTime}>{formatDate(item.scannedAt)}</Text>
        <Text style={styles.cardContent} numberOfLines={2}>
          {item.data}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Trash2 size={16} color={Colors.danger} />
        </TouchableOpacity>
        <ChevronRight size={16} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { history, scanned, removeFromHistory, removeScanned, clearHistory, clearScanned } = useQRHistory();
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const tabIndicator = useRef(new Animated.Value(0)).current;

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(tabIndicator, {
      toValue: tab === 'created' ? 0 : 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [tabIndicator]);

  const handleClear = useCallback(() => {
    const title = activeTab === 'created' ? 'Clear Created History' : 'Clear Scan History';
    const message = 'This will remove all items. Are you sure?';
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => {
          if (activeTab === 'created') clearHistory();
          else clearScanned();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [activeTab, clearHistory, clearScanned]);

  const currentData = activeTab === 'created' ? history : scanned;
  const isEmpty = currentData.length === 0;

  const indicatorTranslate = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <View style={styles.tabsWrapper}>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [{
                  translateX: tabIndicator.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (Platform.OS === 'web' ? 170 : 160)],
                  }),
                }],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.tab}
            onPress={() => switchTab('created')}
            activeOpacity={0.7}
          >
            <QrCode size={16} color={activeTab === 'created' ? Colors.accent : Colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === 'created' && styles.tabTextActive]}>
              Created ({history.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => switchTab('scanned')}
            activeOpacity={0.7}
          >
            <ScanLine size={16} color={activeTab === 'scanned' ? Colors.accent : Colors.textTertiary} />
            <Text style={[styles.tabText, activeTab === 'scanned' && styles.tabTextActive]}>
              Scanned ({scanned.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Clock size={36} color={Colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No {activeTab === 'created' ? 'QR codes' : 'scans'} yet</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'created'
              ? 'QR codes you create and save will appear here'
              : 'QR codes you scan will appear here'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listCount}>
              {currentData.length} {currentData.length === 1 ? 'item' : 'items'}
            </Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          {activeTab === 'created' ? (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CreatedItem item={item} onDelete={removeFromHistory} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={scanned}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ScannedItem item={item} onDelete={removeScanned} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '48%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 11,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listCount: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  clearText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600' as const,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  thumbImage: {
    width: 44,
    height: 44,
  },
  scanIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  cardTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  cardContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
