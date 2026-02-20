import React, { useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Pop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

interface PopMapProps {
  pops: Pop[];
  onPopClick?: (pop: Pop) => void;
}

const PopMap: React.FC<PopMapProps> = ({ pops, onPopClick }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([0, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add markers for POPs with valid coordinates
    const validPops = pops.filter(
      (pop) => pop.latitude != null && pop.longitude != null
    );

    if (validPops.length > 0) {
      validPops.forEach((pop) => {
        const marker = L.marker([pop.latitude, pop.longitude])
          .addTo(mapRef.current!)
          .bindPopup(
            `<strong>${pop.name}</strong><br/>
            ${pop.address || ''}<br/>
            ${pop.city || ''}, ${pop.country || ''}`
          );

        if (onPopClick) {
          marker.on('click', () => onPopClick(pop));
        }
      });

      // Fit map to show all markers
      const bounds = L.latLngBounds(
        validPops.map((pop) => [pop.latitude, pop.longitude])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pops, onPopClick]);

  return (
    <Paper elevation={2}>
      <Box
        ref={mapContainerRef}
        sx={{
          height: '500px',
          width: '100%',
          borderRadius: 1,
        }}
      />
    </Paper>
  );
};

export default PopMap;
