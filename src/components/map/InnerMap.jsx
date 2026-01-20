import React, { useEffect, useRef, useState } from 'react';
import { NAVER_MAP_CLIENT_ID, DEFAULT_CENTER } from '../../constants';
import './MapView.css';

const InnerMap = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load Naver Map Script
    useEffect(() => {
        const scriptId = 'naver-map-script';
        if (document.getElementById(scriptId)) {
            setIsLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}`;
        script.async = true;
        script.onload = () => setIsLoaded(true);
        document.head.appendChild(script);
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!isLoaded || !mapRef.current || !window.naver) return;

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

            // Signal ready
            window.parent.postMessage({ type: 'MAP_READY' }, '*');
        }
    }, [isLoaded]);

    // Handle Messages from Parent
    useEffect(() => {
        const handleMessage = (event) => {
            if (!event.data || event.data.type !== 'UPDATE_MARKERS') return;
            const restaurants = event.data.payload || [];
            updateMarkers(restaurants);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isLoaded]);

    const updateMarkers = (restaurants) => {
        if (!mapInstance.current || !window.naver) return;

        // Clear existing
        markers.current.forEach(m => m.setMap(null));
        markers.current = [];

        if (restaurants.length === 0) return;

        const bounds = new window.naver.maps.LatLngBounds();
        const map = mapInstance.current;

        restaurants.forEach((rest, index) => {
            if (!rest.latitude || !rest.longitude) return;

            const position = new window.naver.maps.LatLng(rest.latitude, rest.longitude);
            bounds.extend(position);

            // Using simple markers for robustness in iframe
            const markerHtml = `
                <div style="position:relative; cursor:pointer;" title="${rest.name}">
                    <div style="width:24px; height:24px; background:#4e5968; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
                        ${index + 1}
                    </div>
                </div>
            `;

            const marker = new window.naver.maps.Marker({
                position: position,
                map: map,
                icon: {
                    content: markerHtml,
                    size: new window.naver.maps.Size(30, 30),
                    anchor: new window.naver.maps.Point(15, 15)
                }
            });
            markers.current.push(marker);
        });

        if (restaurants.length > 0) {
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
    };

    return <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />;
};

export default InnerMap;
