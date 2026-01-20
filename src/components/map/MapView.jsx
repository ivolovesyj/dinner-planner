import React, { useEffect, useRef, useState } from 'react';
const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
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


    const initialBoundsFitted = useRef(false);

    // Initialize Map and Markers
    useEffect(() => {
        // Strict guard clauses
        if (!isLoaded) return;
        if (!mapRef.current) return;
        if (typeof window === 'undefined' || !window.naver || !window.naver.maps) return;

        // Function to initialize the map and handle markers
        const initializeMap = () => {
            if (!mapRef.current || !window.naver) return;

            if (!mapInstance.current) {
                mapInstance.current = new window.naver.maps.Map(mapRef.current, {
                    center: new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
                    zoom: 14,
                    scaleControl: false,
                    logoControl: false,
                    mapDataControl: false,
                    zoomControl: true,
                    zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT },
                    minZoom: 6,
                });

                window.naver.maps.Event.trigger(mapInstance.current, 'resize');
            }

            const map = mapInstance.current;
            if (!map) return;

            // Update Markers
            try {
                // Clear existing markers
                markers.current.forEach(m => m.setMap(null));
                markers.current = [];

                if (!restaurants || restaurants.length === 0) {
                    if (!initialBoundsFitted.current) {
                        map.setCenter(new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
                        map.setZoom(14);
                        initialBoundsFitted.current = true;
                    }
                    return;
                }

                const bounds = new window.naver.maps.LatLngBounds();

                const createMarker = (lat, lng, rest) => {
                    const position = new window.naver.maps.LatLng(lat, lng);
                    bounds.extend(position);

                    const marker = new window.naver.maps.Marker({
                        position: position,
                        map: map,
                        title: rest.name,
                        icon: {
                            content: `
                                <div style="padding: 5px 10px; background: white; border: 1px solid #ccc; border-radius: 15px; font-weight: bold; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); white-space: nowrap;">
                                    ${rest.name}
                                </div>
                            `,
                            anchor: new window.naver.maps.Point(15, 15),
                        }
                    });

                    markers.current.push(marker);

                    window.naver.maps.Event.addListener(marker, 'click', () => {
                        if (onMarkerClick) onMarkerClick(rest.id);
                        map.panTo(position);
                    });
                };

                let hasValidResult = false;
                let pendingGeocodes = 0;
                let geocodedMarkersAdded = 0;

                restaurants.forEach((rest) => {
                    const lat = parseFloat(rest.latitude);
                    const lng = parseFloat(rest.longitude);

                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        createMarker(lat, lng, rest);
                        hasValidResult = true;
                    } else if (rest.location) {
                        pendingGeocodes++;
                        window.naver.maps.Service.geocode({
                            query: rest.location
                        }, function (status, response) {
                            pendingGeocodes--;
                            if (status === window.naver.maps.Service.Status.OK && response.v2.addresses.length > 0) {
                                const result = response.v2.addresses[0];
                                const newLat = parseFloat(result.y);
                                const newLng = parseFloat(result.x);

                                createMarker(newLat, newLng, rest);
                                geocodedMarkersAdded++;

                                // Only fit bounds if we haven't done it yet
                                if (pendingGeocodes === 0 && (hasValidResult || geocodedMarkersAdded > 0)) {
                                    if (!initialBoundsFitted.current) {
                                        const newBounds = new window.naver.maps.LatLngBounds();
                                        markers.current.forEach(m => newBounds.extend(m.getPosition()));
                                        map.fitBounds(newBounds, { top: 40, right: 40, bottom: 40, left: 40 });
                                        initialBoundsFitted.current = true;
                                    }
                                }
                            } else {
                                console.warn(`Geocoding failed for ${rest.name}: ${status}`);
                            }

                            if (pendingGeocodes === 0 && !hasValidResult && geocodedMarkersAdded === 0) {
                                if (!initialBoundsFitted.current) {
                                    map.setCenter(new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
                                    map.setZoom(14);
                                    initialBoundsFitted.current = true;
                                }
                            }
                        });
                    }
                });

                if (hasValidResult && pendingGeocodes === 0) {
                    if (!initialBoundsFitted.current) {
                        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
                        initialBoundsFitted.current = true;
                    }
                } else if (!hasValidResult && pendingGeocodes === 0) {
                    if (!initialBoundsFitted.current) {
                        map.setCenter(new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
                        map.setZoom(14);
                        initialBoundsFitted.current = true;
                    }
                }

            } catch (markerErr) {
                console.error("Marker Error:", markerErr);
            }
        };

        // Check if the geocoder submodule is already loaded
        if (window.naver && window.naver.maps && window.naver.maps.Service && window.naver.maps.Service.geocode) {
            initializeMap();
        } else {
            const scriptId = 'naver-map-geocoder-script';
            if (document.getElementById(scriptId)) {
                initializeMap();
                return;
            }

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}&submodules=geocoder`;
            script.async = true;
            script.onload = () => initializeMap();
            script.onerror = () => console.error("Naver Map Geocoder Script Load Failed");
            document.head.appendChild(script);
        }

    }, [isLoaded, restaurants]); // Removed isExpanded

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
