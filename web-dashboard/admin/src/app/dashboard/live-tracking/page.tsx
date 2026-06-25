'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Truck, User } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1rem',
};

// Default to center of India if no specific location
const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629
};

// Mock data for live tracking demo
const mockDeliveries = [
  { id: '1', lat: 28.6139, lng: 77.2090, rider: 'Rajesh Kumar', status: 'IN_TRANSIT', restaurant: 'Spicy Delight' },
  { id: '2', lat: 19.0760, lng: 72.8777, rider: 'Amit Singh', status: 'PICKED_UP', restaurant: 'Mumbai Spices' },
  { id: '3', lat: 12.9716, lng: 77.5946, rider: 'Suresh N', status: 'ARRIVED_AT_CUSTOMER', restaurant: 'Bangalore Bites' },
];

export default function LiveTrackingPage() {
  const { accessToken } = useAuth();
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    // If we had real data bounding boxes, we could fitBounds here.
    // map.setZoom(5);
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-140px)] flex flex-col pb-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-secondary flex items-center gap-2">
            <MapPin className="h-6 w-6 text-brand-primary" /> Live Tracking
          </h2>
          <p className="mt-1 text-sm text-slate-500">Real-time GPS view of active Shadowfax deliveries.</p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-700">SFX SYNC ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative flex-1 rounded-2xl bg-slate-100 shadow-premium overflow-hidden ring-1 ring-slate-200"
      >
        {!isLoaded ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-primary" />
              <p className="text-sm font-medium text-slate-500">Loading Google Maps...</p>
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={5}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: [
                {
                  featureType: "all",
                  elementType: "geometry",
                  stylers: [{ color: "#f8fafc" }]
                },
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [{ color: "#e2e8f0" }]
                },
                {
                  featureType: "landscape.man_made",
                  elementType: "geometry.stroke",
                  stylers: [{ color: "#cbd5e1" }]
                }
              ] // Minimalistic map style
            }}
          >
            {mockDeliveries.map((delivery) => (
              <Marker
                key={delivery.id}
                position={{ lat: delivery.lat, lng: delivery.lng }}
                onClick={() => setActiveMarker(delivery.id)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#FF6B00",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
              >
                {activeMarker === delivery.id && (
                  <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                    <div className="p-1 min-w-[150px]">
                      <p className="font-bold text-slate-800 text-sm">{delivery.restaurant}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> {delivery.rider}
                      </p>
                      <div className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {delivery.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
        )}

        {/* Floating Panel Overlay */}
        <div className="absolute top-4 left-4 z-10 w-64 rounded-xl bg-white/90 p-4 shadow-xl backdrop-blur-md ring-1 ring-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-brand-primary" /> Active Routes
          </h3>
          <div className="space-y-3">
            {mockDeliveries.map(d => (
              <div key={d.id} className="text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <p className="font-semibold text-slate-700">{d.rider}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-500 truncate max-w-[120px]">{d.restaurant}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-brand-primary">{d.status}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-3 pt-2 border-t border-slate-100">Mock Data Mode</p>
        </div>
      </motion.div>
    </div>
  );
}
