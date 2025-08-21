import React, { useState, useRef, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Camera, QrCode, ArrowLeft, Smartphone, RotateCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const QRCodeScanner = () => {
  const [scanResult, setScanResult] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check if user is on mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(isMobileDevice);
    
    // Check for manual code in URL
    const code = searchParams.get('code');
    if (code) {
      setManualCode(code);
      processQRCode(code);
    }
  }, [searchParams]);

  const handleScan = (result) => {
    if (result?.text) {
      setScanResult(result.text);
      // Process the QR code result
      processQRCode(result.text);
    }
  };

  const processQRCode = (code) => {
    try {
      // Try to parse the URL to extract the restaurant ID
      let restaurantId = code;
      
      // If the code is a URL, try to extract the restaurant ID from it
      try {
        const url = new URL(code);
        const pathParts = url.pathname.split('/');
        const restaurantIndex = pathParts.indexOf('restaurant');
        if (restaurantIndex > -1 && pathParts.length > restaurantIndex + 1) {
          restaurantId = pathParts[restaurantIndex + 1];
        }
        
        // Also check for code parameter
        const codeParam = url.searchParams.get('code');
        if (codeParam) {
          restaurantId = codeParam;
        }
      } catch (e) {
        // Not a valid URL, use the code as is
        console.log('Using raw code as restaurant ID');
      }
      
      // Navigate to the restaurant connection page
      navigate(`/customer/restaurant/${restaurantId}`);
    } catch (err) {
      console.error('Error processing QR code:', err);
      setError('Invalid QR code. Please try again or enter the code manually.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError('Please enter a QR code');
      return;
    }
    processQRCode(manualCode.trim());
  };

  const toggleCamera = async () => {
    try {
      // Stop any existing streams
      if (cameraActive) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraActive(!cameraActive);
      setCameraError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Could not access camera. Please check your device settings.');
      setCameraActive(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Connect to Restaurant</h1>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-6">
            {!isMobile ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <Smartphone className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mobile Device Recommended</h3>
                <p className="text-gray-600 mb-6">For the best experience, please use a mobile device to scan QR codes.</p>
                <Button 
                  variant="outline" 
                  onClick={() => setCameraActive(false)}
                  className="gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  Enter Code Manually
                </Button>
              </div>
            ) : cameraActive ? (
              <div className="relative w-full h-full">
                <QrReader
                  onResult={(result, error) => {
                    if (result) {
                      handleScan(result);
                    }
                    if (error) {
                      console.error(error);
                      setCameraError('Failed to access camera. Please check permissions.');
                    }
                  }}
                  constraints={{ 
                    facingMode: 'environment',
                    aspectRatio: 1,
                    width: { min: 1024, ideal: 1280, max: 1920 },
                    height: { min: 720, ideal: 1280, max: 1080 }
                  }}
                  className="w-full h-full object-cover"
                  videoStyle={{
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%',
                    transform: 'scaleX(-1)' // Mirror the camera feed
                  }}
                  videoContainerStyle={{
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }}
                  scanDelay={300}
                />
                {cameraError && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                    <p className="text-white text-center">{cameraError}</p>
                  </div>
                )}
                <div className="absolute inset-0 border-4 border-primary/30 rounded-lg pointer-events-none"></div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <QrCode className="h-24 w-24 text-gray-300" />
              </div>
            )}
            
            {isMobile && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={toggleCamera}
                  className="flex items-center gap-2"
                >
                  {cameraActive ? (
                    <>
                      <CameraOff className="h-4 w-4" />
                      Turn Off Camera
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      Try Camera Again
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">
              {isMobile ? 'Scan Restaurant QR Code' : 'Restaurant Access'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isMobile 
                ? 'Point your camera at the QR code on the table or menu to connect to the restaurant\'s menu.'
                : 'Enter the restaurant code below or use a mobile device to scan the QR code.'
              }
            </p>
            
            {error && (
              <div className="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-center text-gray-500 text-sm font-medium mb-4">OR</h3>
            <p className="text-center text-gray-600 mb-4">
              Enter the restaurant code manually
            </p>
            
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter restaurant code"
                className="flex-1"
              />
              <Button type="submit">Connect</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
