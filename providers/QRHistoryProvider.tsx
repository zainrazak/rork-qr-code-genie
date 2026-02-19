import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { QRCodeItem, ScannedQRCode } from '@/types/qr';
import { generateId, detectContentType } from '@/utils/qr';

const HISTORY_KEY = 'qr_history';
const SCANNED_KEY = 'qr_scanned';

export const [QRHistoryProvider, useQRHistory] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<QRCodeItem[]>([]);
  const [scanned, setScanned] = useState<ScannedQRCode[]>([]);

  const historyQuery = useQuery({
    queryKey: ['qr-history'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(HISTORY_KEY);
      return stored ? (JSON.parse(stored) as QRCodeItem[]) : [];
    },
  });

  const scannedQuery = useQuery({
    queryKey: ['qr-scanned'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SCANNED_KEY);
      return stored ? (JSON.parse(stored) as ScannedQRCode[]) : [];
    },
  });

  useEffect(() => {
    if (historyQuery.data) {
      setHistory(historyQuery.data);
    }
  }, [historyQuery.data]);

  useEffect(() => {
    if (scannedQuery.data) {
      setScanned(scannedQuery.data);
    }
  }, [scannedQuery.data]);

  const saveHistoryMutation = useMutation({
    mutationFn: async (items: QRCodeItem[]) => {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
      return items;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-history'] });
    },
  });

  const saveScannedMutation = useMutation({
    mutationFn: async (items: ScannedQRCode[]) => {
      await AsyncStorage.setItem(SCANNED_KEY, JSON.stringify(items));
      return items;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-scanned'] });
    },
  });

  const addToHistory = useCallback((content: string, label?: string) => {
    const item: QRCodeItem = {
      id: generateId(),
      content,
      label: label || content.substring(0, 50),
      createdAt: Date.now(),
      type: detectContentType(content),
    };
    const updated = [item, ...history];
    setHistory(updated);
    saveHistoryMutation.mutate(updated);
    return item;
  }, [history, saveHistoryMutation]);

  const addScanned = useCallback((data: string, type: string) => {
    const item: ScannedQRCode = {
      id: generateId(),
      data,
      scannedAt: Date.now(),
      type,
    };
    const updated = [item, ...scanned];
    setScanned(updated);
    saveScannedMutation.mutate(updated);
    return item;
  }, [scanned, saveScannedMutation]);

  const removeFromHistory = useCallback((id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    saveHistoryMutation.mutate(updated);
  }, [history, saveHistoryMutation]);

  const removeScanned = useCallback((id: string) => {
    const updated = scanned.filter(item => item.id !== id);
    setScanned(updated);
    saveScannedMutation.mutate(updated);
  }, [scanned, saveScannedMutation]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistoryMutation.mutate([]);
  }, [saveHistoryMutation]);

  const clearScanned = useCallback(() => {
    setScanned([]);
    saveScannedMutation.mutate([]);
  }, [saveScannedMutation]);

  return {
    history,
    scanned,
    addToHistory,
    addScanned,
    removeFromHistory,
    removeScanned,
    clearHistory,
    clearScanned,
    isLoading: historyQuery.isLoading || scannedQuery.isLoading,
  };
});
