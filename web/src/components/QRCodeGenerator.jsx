import { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Copy, Download, Loader2 } from 'lucide-react';

function QRCodeGenerator({ open, onOpenChange, restaurant }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const qrCodeRef = useRef(null);
  
  if (!restaurant?.id) return null;
  
  // Generate the QR code URL using restaurant name (URL-friendly format)
  const generateQrUrl = () => {
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
    // Convert restaurant name to URL-friendly format (lowercase, replace spaces with hyphens)
    const restaurantSlug = restaurant?.name
      ? restaurant.name.toLowerCase().replace(/\s+/g, '-')
      : restaurant.id;
    return `${baseUrl}/customer/restaurant/${restaurantSlug}`;
  };
  
  const qrUrl = generateQrUrl();
  
  // Format the restaurant name for display
  const formatRestaurantName = (name) => {
    if (!name) return '';
    return name;
  };
  
  // Copy text to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  
  // Download QR code as PNG
  const downloadQRCode = () => {
    if (!qrCodeRef.current) return;
    
    setIsDownloading(true);
    
    try {
      const svg = qrCodeRef.current.querySelector('svg');
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 60;
        
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.drawImage(img, 20, 20, img.width, img.height);
        
        // Add restaurant name if available
        if (restaurant?.name) {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(restaurant.name, canvas.width / 2, 20);
        }
        
        // Add URL
        ctx.font = '12px Arial';
        ctx.fillText("Scan to view menu", canvas.width / 2, canvas.height - 10);
        
        // Trigger download
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        // Create a filename from the restaurant name or use ID as fallback
        const fileName = restaurant?.name 
          ? `menu-${restaurant.name.toLowerCase().replace(/\s+/g, '-')}` 
          : `menu-${restaurant.id}`;
        downloadLink.download = `${fileName}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Error downloading QR code:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restaurant Access</DialogTitle>
          <DialogDescription>
            Share this QR code or URL with your customers
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6">
          {/* QR Code */}
          <div className="p-4 bg-white rounded-lg border">
            <div ref={qrCodeRef} className="p-2 bg-white">
              <QRCode
                value={qrUrl}
                size={256}
                level="H"
                fgColor="#1f2937"
                bgColor="#ffffff"
              />
            </div>
          </div>
          
          <div className="w-full space-y-4">
            {/* URL */}
            <div>
              <h3 className="text-sm font-medium mb-2">Restaurant URL</h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={qrUrl}
                    readOnly
                    className="w-full px-3 py-2 border rounded-md bg-muted/50 text-sm font-mono text-ellipsis overflow-hidden"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(qrUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gray-100 rounded-md dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium">Restaurant: </span>
                  <span className="ml-2 font-medium">
                    {formatRestaurantName(restaurant.name || '')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6"
                  onClick={() => copyToClipboard(restaurant.name || '')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end mt-4">
          <Button
            onClick={downloadQRCode}
            disabled={isDownloading}
            className="w-full sm:w-auto"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download QR Code
              </>
            )}
          </Button>
          <Button type="button" onClick={onOpenChange}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QRCodeGenerator;
