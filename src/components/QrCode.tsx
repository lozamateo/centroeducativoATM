import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { colors } from '../../shared/theme';

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: colors.primaryDark, light: '#ffffff' } }).then(setSrc);
  }, [value, size]);

  return src ? <img src={src} width={size} height={size} alt="Código QR de la credencial" className="qr" /> : null;
}
