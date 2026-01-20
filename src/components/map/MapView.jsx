import React, { useEffect, useRef, useState } from 'react';
import { NAVER_MAP_CLIENT_ID } from '../../constants';
import './MapView.css';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // Define locally to prevent import crashes

const MapView = ({ restaurants, isExpanded, onToggle, onMarkerClick }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load Naver Map Script
    useEffect(() => {
        const scriptId = 'naver-map-script';

        // Check if script already exists
        if (document.getElementById(scriptId)) {
            // If window.naver exists, we are loaded.
            if (window.naver && window.naver.maps) {
                setIsLoaded(true);
            } else {
                // Script loaded but naver object not ready? Add listener?
                // Usually it's synchronous after load. Just set true and let the next effect check guarding.
                setIsLoaded(true);
            }
            return;
        }

        const handleScriptLoad = () => setIsLoaded(true);
        const handleScriptError = () => console.error("Naver Map Script Load Failed");

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`;
        script.async = true;
        script.onload = handleScriptLoad;
        script.onerror = handleScriptError;
        document.head.appendChild(script);
    }, []);

    // Initialize Map and Markers
    useEffect(() => {
        // Strict guard clauses
        if (!isLoaded) return;
        if (!mapRef.current) return;
        if (typeof window === 'undefined' || !window.naver || !window.naver.maps) return;

        try {
            if (!mapInstance.current) {
                mapInstance.current = new window.naver.maps.Map(mapRef.current, {
                    center: new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
                    zoom: 14,
                    scaleControl: false,
                    logoControl: false,
                    mapDataControl: false,
                    zoomControl: true,
                    zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT }
                });

                // Resize trigger to render tiles correctly
                window.naver.maps.Event.trigger(mapInstance.current, 'resize');
            }
        } catch (err) {
            console.error("Map Init Error:", err);
        }

        const map = mapInstance.current;
        if (!map) return;

        // Update Markers
        try {
            markers.current.forEach(m => m.setMap(null));
            markers.current = [];

            if (!restaurants || restaurants.length === 0) return;

            const bounds = new window.naver.maps.LatLngBounds();
            const sortedRestaurants = [...restaurants].sort((a, b) =>
                ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0))
            );

            restaurants.forEach((rest) => {
                if (!rest.latitude || !rest.longitude) return;

                const position = new window.naver.maps.LatLng(rest.latitude, rest.longitude);
                bounds.extend(position);

                const score = (rest.likes || 0) - (rest.dislikes || 0);
                const rank = sortedRestaurants.findIndex(r => r.id === rest.id) + 1;
                const isTopRank = rank <= 3 && score > 0;

                const markerHtml = `
                        <div class="custom-marker ${isTopRank ? `rank-${rank}` : ''}">
                            <div class="marker-badge">${rank}</div>
                            <div class="marker-label">${rest.name}</div>
                        </div>
                    `;

                const marker = new window.naver.maps.Marker({
                    position: position,
                    map: map,
                    icon: {
                        content: markerHtml,
                        size: new window.naver.maps.Size(32, 32),
                        anchor: new window.naver.maps.Point(16, 16)
                    }
                });

                window.naver.maps.Event.addListener(marker, 'click', () => {
                    if (onMarkerClick) onMarkerClick(rest.id);
                });

                markers.current.push(marker);
            });

            if (restaurants.length > 0) {
                // Determine fitBounds options based on device
                map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
            }
        } catch (markerErr) {
            console.error("Marker Error:", markerErr);
        }

    }, [isLoaded, restaurants, isExpanded]);

    // Resize handling
    useEffect(() => {
        if (mapInstance.current && isExpanded && window.naver && window.naver.maps) {
            window.naver.maps.Event.trigger(mapInstance.current, 'resize');
            // Consider recentering?
        }
    }, [isExpanded]);


    return (
        <div className={`map-container ${isExpanded ? 'expanded' : ''}`}>
            <div className="naver-map" ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default MapView;
