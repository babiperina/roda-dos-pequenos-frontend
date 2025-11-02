'use client';

/**
 * ✅ MAPA + LISTA DE LOCAIS ORDENADA POR DISTÂNCIA
 * - Mapa Leaflet com pins personalizados
 * - Botão “Localizar-me”
 * - Lista ordenada por proximidade (em km)
 */

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import locaisData from '@/data/locais.json';

// ---------- Tipos ----------
type Local = {
  nome: string;
  lat: number;
  lng: number;
  descricao?: string;
  endereco?: string;
  telefone?: string;
  categoria?: string;
  cor?: string;
  distancia?: number; // será calculada dinamicamente
};

// ---------- Configurações ----------
const MAP_INITIAL_CENTER: [number, number] = [-3.87, -38.39];
const MAP_INITIAL_ZOOM = 11;
const DEFAULT_PIN_COLOR = '#f87171';
const COLOR_BY_CATEGORY: Record<string, string> = {
  parque: '#4ade80',
  aquatico: '#60a5fa',
  restaurante: '#facc15',
  cultura: '#a78bfa',
};
const PIN_SIZE = 30;

// ---------- Utilidades ----------
function getPinColor(local: Local): string {
  if (local.cor) return local.cor;
  if (local.categoria && COLOR_BY_CATEGORY[local.categoria]) {
    return COLOR_BY_CATEGORY[local.categoria];
  }
  return DEFAULT_PIN_COLOR;
}

function makeSvgPin(L: any, color: string) {
  return L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${PIN_SIZE}" height="${PIN_SIZE}" viewBox="0 0 24 24" fill="${color}">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5
         c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5
         2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
      </svg>
    `,
    className: '',
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE],
    popupAnchor: [0, -PIN_SIZE],
  });
}

// Distância entre duas coordenadas (Haversine)
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}

// ---------- Componente principal ----------
export default function MapClient() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const Lref = useRef<any>(null);
  const [locais, setLocais] = useState<Local[]>(locaisData as Local[]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const L = await import('leaflet');
      Lref.current = L;

      const map = L.map(mapRef.current as HTMLDivElement, {
        center: MAP_INITIAL_CENTER,
        zoom: MAP_INITIAL_ZOOM,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // adiciona locais
      (locaisData as Local[]).forEach((local) => {
        const icon = makeSvgPin(L, getPinColor(local));
        L.marker([local.lat, local.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${local.nome}</b><br>${local.descricao || ''}`);
      });

      // centraliza todos os pontos
      const coords = (locaisData as Local[]).map((l) => [l.lat, l.lng]) as [number, number][];
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40] });
    })();

    return () => {
      const map = mapInstanceRef.current;
      if (map) map.remove();
    };
  }, []);

  // ---------- Geolocalização ----------
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização.');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
        setLoading(false);

        const L = Lref.current;
        const map = mapInstanceRef.current;

        const userIcon = L.divIcon({
          html: `
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#3b82f6">
              <circle cx="12" cy="12" r="10" fill="#3b82f6" opacity="0.4"/>
              <circle cx="12" cy="12" r="6" fill="#3b82f6"/>
              <circle cx="12" cy="12" r="3" fill="#ffffff"/>
            </svg>
          `,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        L.marker([latitude, longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>Você está aqui!</b>');

        map.setView([latitude, longitude], 13);

        // ordena os locais pela distância
        const novosLocais = (locaisData as Local[]).map((l) => ({
          ...l,
          distancia: distanceKm(latitude, longitude, l.lat, l.lng),
        }));
        novosLocais.sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0));
        setLocais(novosLocais);
      },
      (err) => {
        setLoading(false);
        alert('Não foi possível obter sua localização: ' + err.message);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* MAPA */}
      <div ref={mapRef} style={{ height: '60vh', width: '100%' }} />

      {/* BOTÃO */}
      <button
        onClick={requestUserLocation}
        disabled={loading}
        style={{
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 1000,
          padding: '8px 10px',
          borderRadius: 6,
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        {loading ? 'Buscando...' : '📍 Localizar-me'}
      </button>

      {/* LISTA DE LOCAIS */}
      <div style={{ padding: '1rem', background: '#fafafa' }}>
        <h2 style={{ marginBottom: 10, fontSize: 18, fontWeight: 600 }}>
          Locais próximos
        </h2>

        {locais.map((l, i) => (
          <div
            key={i}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid #ddd',
            }}
          >
            <div style={{ fontWeight: 600 }}>{l.nome}</div>
            <div style={{ fontSize: 14, color: '#555' }}>
              {l.descricao || ''}
            </div>
            {l.distancia !== undefined && userPos && (
              <div style={{ fontSize: 13, color: '#777' }}>
                {l.distancia.toFixed(1)} km de você
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
