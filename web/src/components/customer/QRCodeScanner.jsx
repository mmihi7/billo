import React, { useState, useRef, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Camera, CameraOff, QrCode, ArrowLeft, KeySquare, X, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const QRCodeScanner = () => {
  const [scanResult, setScanResult] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const manualInputRef = useRef(null);

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

  const processQRCode = async (code) => {
    if (isLoading) return; // Prevent multiple submissions
    
    setIsLoading(true);
    setError('');
    
    try {
      if (!code || typeof code !== 'string') {
        throw new Error('No restaurant name or URL provided');
      }
      
      let restaurantIdentifier = code.trim();
      
      // If the input is a URL, extract the restaurant name from the path
      if (code.startsWith('http')) {
        try {
          const url = new URL(code);
          const pathParts = url.pathname.split('/');
          const restaurantIndex = pathParts.indexOf('restaurant');
          if (restaurantIndex > -1 && pathParts.length > restaurantIndex + 1) {
            restaurantIdentifier = pathParts[restaurantIndex + 1];
          }
        } catch (e) {
          console.warn('Error parsing URL, trying as direct name');
        }
      }
      
      // Clean the restaurant name (convert to lowercase and replace spaces with hyphens)
      const cleanName = restaurantIdentifier.toLowerCase().replace(/\s+/g, '-');
      
      if (!cleanName) {
        throw new Error('Please enter a valid restaurant name');
      }
      
      // Verify the restaurant exists before navigating
      const { getRestaurantByName } = await import('@/lib/database');
      const restaurant = await getRestaurantByName(cleanName);
      
      if (!restaurant) {
        throw new Error('Restaurant not found. Please check the name and try again.');
      }
      
      // Navigate to the restaurant page using the clean name
      navigate(`/customer/restaurant/${cleanName}`, {
        state: { fromQR: true } // Add state to indicate this came from a QR code
      });
      
    } catch (err) {
      console.error('Error processing code:', err);
      setError(err.message || 'Invalid code. Please try again.');
      setCameraActive(false); // Switch to manual entry on error
      if (manualInputRef.current) {
        manualInputRef.current.focus();
      }
    } finally {
      setIsLoading(false);
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
    if (cameraActive) {
      // If turning off, just update the state
      setCameraActive(false);
      return;
    }
    
    // If turning on, check for camera permissions
    try {
      setError('');
      setCameraError('');
      
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Prefer rear camera on mobile
        } 
      });
      
      // Stop any existing tracks
      stream.getTracks().forEach(track => track.stop());
      
      // If we got here, permission was granted
      setCameraActive(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Could not access camera. Please check your device settings or enter the code manually.');
      setCameraActive(false);
      
      // Focus the manual input if camera access fails
      if (manualInputRef.current) {
        manualInputRef.current.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="text-white hover:bg-blue-500"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Scan QR Code</h1>
              <p className="text-sm text-blue-100">Point your camera at the restaurant's QR code</p>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        <div className="px-6 pt-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{cameraError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {cameraActive ? (
            <div className="relative w-full aspect-square max-w-sm mx-auto mb-6 rounded-xl overflow-hidden bg-black">
              <QrReader
                onResult={handleScan}
                constraints={{
                  facingMode: 'environment',
                  aspectRatio: 1,
                }}
                className="w-full h-full"
                videoStyle={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                containerStyle={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                }}
                scanDelay={300}
              />
              <div className="absolute inset-0 border-4 border-blue-400 rounded-xl pointer-events-none" style={{
                boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.7)',
                clipPath: 'inset(0 0 0 0)'
              }}>
                <div className="absolute top-4 left-0 right-0 flex justify-center">
                  <div className="bg-black bg-opacity-70 text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center">
                    <QrCode className="h-4 w-4 mr-2" />
                    Align QR code within frame
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-1/2 border-2 border-white border-dashed rounded-lg opacity-30"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-8 mb-6 border-2 border-dashed border-gray-300">
              <QrCode className="h-20 w-20 text-gray-300 mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-medium text-gray-700 mb-1">Camera is off</h3>
              <p className="text-gray-500 text-center text-sm">
                Enable the camera to scan QR codes or enter the code manually below
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
            <Button
              variant={cameraActive ? 'outline' : 'default'}
              onClick={toggleCamera}
              className="flex-1 sm:flex-none justify-center gap-2"
              size="lg"
            >
              {cameraActive ? (
                <>
                  <CameraOff className="h-4 w-4" />
                  Turn Off
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Turn On Camera
                </>
              )}
            </Button>
            
            {!cameraActive && (
              <Button
                variant="outline"
                onClick={() => {
                  setManualCode('');
                  setError('');
                  setTimeout(() => {
                    if (manualInputRef.current) manualInputRef.current.focus();
                  }, 100);
                }}
                className="flex-1 sm:flex-none justify-center gap-2"
                size="lg"
              >
                <KeySquare className="h-4 w-4" />
                Enter Code
              </Button>
            )}
          </div>

          {/* Manual Entry Form */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <KeySquare className="h-5 w-5 text-gray-500" />
              Enter Code Manually
            </h2>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label htmlFor="manualCode" className="block text-sm font-medium text-gray-700 mb-2">
                  6-character code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="manualCodeInput"
                      ref={manualInputRef}
                      type="text"
                      placeholder="e.g. A1B2C3"
                      value={manualCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                        setManualCode(value);
                        if (error) setError('');
                      }}
                      maxLength={6}
                      className="text-center font-mono text-xl tracking-widest h-14 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      autoComplete="off"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                      disabled={isLoading}
                    />
                    {manualCode && (
                      <button
                        type="button"
                        onClick={() => setManualCode('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!manualCode || manualCode.length !== 6 || isLoading}
                    className="h-14 px-6 text-base font-medium"
                    size="lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Go'
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Enter the 6-character code provided by the restaurant
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Help Text */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Need help?</h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>Ask restaurant staff for assistance or try entering the code manually.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
