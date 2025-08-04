import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function QRCodeScanner() {
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef();
  const navigate = useNavigate();

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        streamRef.current = stream;
        setCameraActive(true);
        scanQRCode();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please ensure you have granted camera permissions.');
    }
  };

  const handleQRCodeData = (qrData) => {
    try {
      // Try to parse as JSON first (legacy format)
      try {
        const data = JSON.parse(qrData);
        if (data.restaurantId) {
          stopCamera();
          navigate(`/restaurant/${data.restaurantId}/menu`);
          return true;
        }
      } catch (e) {
        // Not a JSON, continue to URL parsing
      }

      // Try to parse as URL
      try {
        const url = new URL(qrData);
        const restaurantId = url.searchParams.get('restaurantId');
        if (restaurantId) {
          stopCamera();
          navigate(`/restaurant/${restaurantId}/menu`);
          return true;
        }
      } catch (e) {
        // Not a valid URL, continue
      }

      // If we get here, the QR code format is not recognized
      console.log('Unrecognized QR code format:', qrData);
      return false;
    } catch (err) {
      console.error('Error processing QR code:', err);
      return false;
    }
  };

  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await barcodeDetector.detect(video);
        
        if (barcodes.length > 0) {
          const qrData = barcodes[0].rawValue;
          if (handleQRCodeData(qrData)) {
            return; // Navigation happened, stop scanning
          }
        }
      } catch (err) {
        console.error('Barcode detection error:', err);
      }
    }

    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(scanQRCode);
    }
  };

  useEffect(() => {
    // Check if BarcodeDetector is supported
    if (!('BarcodeDetector' in window)) {
      setError('QR code scanning is not supported in your browser. Please use a modern browser like Chrome or Edge.');
      return;
    }

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-4">Scan Restaurant QR Code</h2>
      
      <div className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
        {error ? (
          <div className="text-red-500 text-center p-4">
            {error}
            <Button 
              onClick={() => setError('')} 
              className="mt-4"
              disabled={!('BarcodeDetector' in window)}
            >
              Try Again
            </Button>
          </div>
        ) : cameraActive ? (
          <div className="relative w-full" style={{ paddingBottom: '75%' }}>
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover rounded"
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <Button onClick={startCamera}>
              Start Camera
            </Button>
          </div>
        )}
      </div>

      {cameraActive && (
        <Button 
          variant="outline" 
          onClick={stopCamera}
          className="mb-4"
        >
          Stop Camera
        </Button>
      )}

      <p className="text-sm text-gray-600 text-center">
        Point your camera at a restaurant's QR code to view their menu.
      </p>
    </div>
  );
}
