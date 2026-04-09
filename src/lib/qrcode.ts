import QRCode from 'qrcode'

// Generate a QR code as a data URL (PNG) for a given URL.
// Branded with tangerine color and rounded corners via SVG approach where possible.
export async function generateQRCode(url: string, options: {
  size?: number
  color?: string
  background?: string
  margin?: number
} = {}): Promise<string> {
  const { size = 512, color = '#0A0E17', background = '#FFFFFF', margin = 2 } = options
  return QRCode.toDataURL(url, {
    width: size,
    margin,
    color: { dark: color, light: background },
    errorCorrectionLevel: 'H', // High error correction for branded center logo
  })
}

// Download a QR code as a PNG file
export async function downloadQRCode(url: string, filename: string = 'reelst-qr.png') {
  const dataUrl = await generateQRCode(url, { size: 1024 })
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
