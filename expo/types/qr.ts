export interface QRCodeItem {
  id: string;
  content: string;
  label: string;
  createdAt: number;
  type: 'url' | 'text' | 'email' | 'phone' | 'wifi';
}

export interface ScannedQRCode {
  id: string;
  data: string;
  scannedAt: number;
  type: string;
}
