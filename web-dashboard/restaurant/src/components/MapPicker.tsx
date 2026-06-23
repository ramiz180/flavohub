'use client';

import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
}

const libraries: "places"[] = ["places"];

export default function MapPicker({ lat, lng, onLocationSelect }: MapPickerProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const center = lat && lng ? { lat, lng } : defaultCenter;

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      onLocationSelect(newLat, newLng);
    }
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newLat = place.geometry.location.lat();
        const newLng = place.geometry.location.lng();
        onLocationSelect(newLat, newLng, place.formatted_address);
        map?.panTo({ lat: newLat, lng: newLng });
        map?.setZoom(15);
      }
    }
  };

  if (!isLoaded) return <div className="h-[400px] w-full bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-sm text-slate-400">Loading Map...</div>;

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10 w-3/4 max-w-sm">
        <Autocomplete
          onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
          onPlaceChanged={handlePlaceChanged}
        >
          <input
            type="text"
            placeholder="Search location..."
            className="w-full px-4 py-3 bg-white shadow-lg rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500"
          />
        </Autocomplete>
      </div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
        }}
      >
        {lat && lng && (
          <Marker
            position={{ lat, lng }}
            draggable={true}
            onDragEnd={handleMapClick}
          />
        )}
      </GoogleMap>
    </div>
  );
}
