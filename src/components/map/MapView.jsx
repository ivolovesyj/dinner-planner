import React, { useEffect, useRef, useState } from 'react';
import { NAVER_MAP_CLIENT_ID, DEFAULT_CENTER } from '../../constants';
import './MapView.css';

const MapView = ({ restaurants, isExpanded, onToggle, onMarkerClick }) => {
    console.log("[Debug] Naver Client ID:", NAVER_MAP_CLIENT_ID); // 디버깅용 로그
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

        return () => {
            // Cleanup if needed
        };
    }, []);

    // Initialize Map and Markers
    useEffect(() => {
        // Safety Check: Ensure naver maps is fully loaded
        if (!isLoaded || !mapRef.current || !window.naver || !window.naver.maps) return;

        try {
            // Initialize Map if not exists
            if (!mapInstance.current) {
                mapInstance.current = new window.naver.maps.Map(mapRef.current, {
                    center: new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
                    zoom: 14,
                    scaleControl: false,
                    logoControl: false,
                    mapDataControl: false,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: window.naver.maps.Position.TOP_RIGHT
                    }
                });

                // Zoom changed listener for label visibility
                window.naver.maps.Event.addListener(mapInstance.current, 'zoom_changed', () => {
                    const zoom = mapInstance.current.getZoom();
                    const labels = document.querySelectorAll('.marker-label');
                    labels.forEach(el => {
                        el.style.display = zoom >= 13 ? 'block' : 'none';
                    });
                });
            }
        } catch (initErr) {
            console.error("Map Initialization Error:", initErr);
            return;
        }

        const map = mapInstance.current; // Shortcut

        // Update Markers
        // Clear existing markers
        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];

        if (!restaurants || restaurants.length === 0) return;

        // Calculate Ranking based on votes
        const sortedRestaurants = [...restaurants].sort((a, b) =>
            ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0))
        );

        const bounds = new window.naver.maps.LatLngBounds();
        let validMarkers = 0;

        restaurants.forEach((rest) => {
            if (!rest.latitude || !rest.longitude) return;

            validMarkers++;
            const position = new window.naver.maps.LatLng(rest.latitude, rest.longitude);
            bounds.extend(position);

            const score = (rest.likes || 0) - (rest.dislikes || 0);
            const rank = sortedRestaurants.findIndex(r => r.id === rest.id) + 1;

            // Marker HTML
            const isTopRank = rank <= 3 && score > 0;
            const markerHtml = `
                <div class="custom-marker ${isTopRank ? `rank-${rank}` : ''}">
                    <div class="marker-badge">${rank}</div>
                    <div class="marker-label" style="display: none;">${rest.name}</div>
                </div>
            `;

            const marker = new window.naver.maps.Marker({
                position: position,
                map: map,
                icon: {
                    content: markerHtml,
                    size: new window.naver.maps.Size(30, 30),
                    anchor: new window.naver.maps.Point(15, 30)
                }
            });

            // Handle Click
            window.naver.maps.Event.addListener(marker, 'click', () => {
                onMarkerClick(rest.id);
            });

            markers.current.push(marker);
        });

        // Fit Bounds if markers exist
        if (validMarkers > 0) {
            if (validMarkers === 1) {
                map.setCenter(bounds.getCenter());
                map.setZoom(15);
            } else {
                map.fitBounds(bounds, {
                    top: 50, bottom: 50, left: 50, right: 50
                });
            }
        }

    }, [isLoaded, restaurants]); // Re-run when restaurants change

    // Handle Resize (Expand/Collapse)
    useEffect(() => {
        if (mapInstance.current) {
            window.naver.maps.Event.trigger(mapInstance.current, 'resize');
            // Re-fit bounds after resize transition (300ms)
            setTimeout(() => {
                if (mapInstance.current && markers.current.length > 0) {
                    // Optional: re-fit bounds? 
                    // Usually keeping current center is better, or re-fit if wanted.
                    // Let's re-fit if it was expanded from collapsed state
                    if (isExpanded && restaurants.length > 0) {
                        // Find bounds again to be safe
                        const bounds = new window.naver.maps.LatLngBounds();
                        let hasPoints = false;
                        restaurants.forEach(r => {
                            if (r.latitude && r.longitude) {
                                bounds.extend(new window.naver.maps.LatLng(r.latitude, r.longitude));
                                hasPoints = true;
                            }
                        });
                        if (hasPoints) {
                            mapInstance.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
                        }
                    }
                }
            }, 300);
        }
    }, [isExpanded]);

    if (!restaurants || restaurants.length === 0) return null;

    return (
        <div className={`map-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="map-toggle-btn" onClick={onToggle}>
                {isExpanded ? '지도 접기 ▲' : '지도 펼치기 ▼'}
            </div>
            <div className="naver-map" ref={mapRef} />
        </div>
    );
};

export default MapView;
