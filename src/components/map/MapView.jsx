import React, { useEffect, useRef, useState } from 'react';
import { NAVER_MAP_CLIENT_ID, DEFAULT_CENTER } from '../../constants';
import './MapView.css';

const MapView = ({ restaurants, isExpanded, onToggle, onMarkerClick }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load Naver Map Script
    useEffect(() => {
        const scriptId = 'naver-map-script';

        const handleScriptLoad = () => setIsLoaded(true);
        const handleScriptError = () => console.error("Naver Map Script Load Failed");

        let script = document.getElementById(scriptId);

        if (script) {
            setIsLoaded(true);
            return;
        }

        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}`;
        script.async = true;
        script.onload = handleScriptLoad;
        script.onerror = handleScriptError;
        document.head.appendChild(script);
    }, []);

    // Initialize Map and Markers
    useEffect(() => {
        if (!isLoaded || !mapRef.current || !window.naver || !window.naver.maps) return;

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

                // Resize trigger
                window.naver.maps.Event.trigger(mapInstance.current, 'resize');
            }
        } catch (err) {
            console.error(err);
        }

        const map = mapInstance.current;

        // Update Markers
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
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }

    }, [isLoaded, restaurants, isExpanded]);

    // Resize handling
    useEffect(() => {
        if (mapInstance.current && isExpanded) {
            window.naver.maps.Event.trigger(mapInstance.current, 'resize');
        }
    }, [isExpanded]);


    return (
        <div className={`map-container ${isExpanded ? 'expanded' : ''}`}>
            <div className="naver-map" ref={mapRef} />
        </div>
    );
};

export default MapView;
