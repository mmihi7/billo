import React, { useEffect } from 'react';

const AdComponent = ({ adSlot, adClient, className, style }) => {
  useEffect(() => {
    // This effect will run once, after the component mounts.
    // It tells AdSense to find and fill the ad unit.
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  // In development, show a placeholder instead of a real ad.
  if (import.meta.env.MODE !== 'production') {
    return (
      <div
        className={className}
        style={{ ...style, background: '#e9e9e9', textAlign: 'center', padding: '1rem', border: '1px dashed #ccc' }}
      >
        Ad Placeholder (Slot: {adSlot})
      </div>
    );
  }

  // In production, render the actual AdSense ad unit.
  return (
    <ins
      className={`adsbygoogle ${className || ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
};

export default AdComponent;