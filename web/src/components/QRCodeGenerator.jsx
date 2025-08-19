import { useState, useRef, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'

function QRCodeGenerator({ open, onOpenChange, restaurant }) {
  const [qrValue, setQrValue] = useState('')
  const qrCodeRef = useRef(null)

  useEffect(() => {
    if (open && restaurant) {
      const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
      const landingUrl = `${baseUrl}/landing?restaurantId=${restaurant.id}`;
      setQrValue(landingUrl);
    }
  }, [open, restaurant])

  const downloadQrCode = () => {
    const svg = qrCodeRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      const safeName = restaurant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      downloadLink.download = `billo-qr-${safeName}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
  }

  const handleClose = () => {
    setQrValue('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Your Restaurant QR Code</DialogTitle>
          <DialogDescription>
            Customers can scan this code to open a tab. Print and display it
            where customers can easily see it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {qrValue ? (
            <div className="p-4 bg-white rounded-md" ref={qrCodeRef}>
              <QRCode value={qrValue} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 256 256`} />
              <p className="text-center font-bold text-lg mt-2">{restaurant?.name}</p>
              <p className="text-center text-muted-foreground">Scan to open a tab</p>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Generating QR Code...
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={downloadQrCode} disabled={!qrValue}>Download QR Code</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default QRCodeGenerator