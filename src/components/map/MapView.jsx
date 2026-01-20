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
                    minZoom: 6, // Added minZoom
                });

                // Resize trigger to render tiles correctly
                window.naver.maps.Event.trigger(mapInstance.current, 'resize');
            }

            const map = mapInstance.current;
            if (!map) return;

            // Update Markers
            try {
                markers.current.forEach(m => m.setMap(null));
                markers.current = [];

                if (!restaurants || restaurants.length === 0) {
                    // Reset to default center if empty
                    map.setCenter(new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
                    map.setZoom(14);
                    return;
                }

                const bounds = new window.naver.maps.LatLngBounds();
                // Removed sortedRestaurants and rank logic as per new marker style

                // Helper to create marker
                const createMarker = (lat, lng, rest) => {
                    const position = new window.naver.maps.LatLng(lat, lng);
                    bounds.extend(position); // Extend bounds for valid markers

                    const marker = new window.naver.maps.Marker({
                        position: position,
                        map: map,
                        title: rest.name, // Added title
                        animation: window.naver.maps.Animation.DROP, // Added animation
                        icon: {
                            content: `
                                <div style="padding: 5px 10px; background: white; border: 1px solid #ccc; border-radius: 15px; font-weight: bold; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); white-space: nowrap;">
                                    ${rest.name}
                                </div>
                            `,
                            anchor: new window.naver.maps.Point(15, 15), // Adjusted anchor
                        }
                    });

                    markers.current.push(marker);

                    window.naver.maps.Event.addListener(marker, 'click', () => {
                        if (onMarkerClick) onMarkerClick(rest.id); // Keep original click handler
                        map.panTo(position); // Optional: InfoWindow or Center
                    });
                };

                let hasValidResult = false;
                let pendingGeocodes = 0;
                let geocodedMarkersAdded = 0;

                restaurants.forEach((rest) => {
                    const lat = parseFloat(rest.latitude);
                    const lng = parseFloat(rest.longitude);

                    // Validator: If valid coords, verify they are in Korea (approx)
                    // If invalid (0,0 or NaN), try Client-Side Geocoding
                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        createMarker(lat, lng, rest);
                        hasValidResult = true;
                    } else if (rest.location) {
                        // Client-Side Geocoding Fallback
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

                                // Adjust bounds after dynamic addition if all geocodes are done
                                if (pendingGeocodes === 0 && (hasValidResult || geocodedMarkersAdded > 0)) {
                                    const newBounds = new window.naver.maps.LatLngBounds();
                                    markers.current.forEach(m => newBounds.extend(m.getPosition()));
                                    map.fitBounds(newBounds, { top: 40, right: 40, bottom: 40, left: 40 });
                                }
                            } else {
                                console.warn(`Geocoding failed for ${rest.name}: ${status}`);
                            }

                            // If all geocodes are done and no markers were added (neither valid nor geocoded)
                            if (pendingGeocodes === 0 && !hasValidResult && geocodedMarkersAdded === 0) {
                                map.setCenter(new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
                                map.setZoom(14);
                            }
                        });
                    }
                });

                // If we have initial valid results, fit bounds immediately.
                // If there are pending geocodes, the bounds will be adjusted after they complete.
                if (hasValidResult && pendingGeocodes === 0) {
                    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
                } else if (!hasValidResult && pendingGeocodes === 0) {
                    // If no valid results and no pending geocodes, reset map
                    map.setCenter(new window.naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
                    map.setZoom(14);
                }

            } catch (markerErr) {
                console.error("Marker Error:", markerErr);
            }
        };

        // Check if the geocoder submodule is already loaded
        if (window.naver && window.naver.maps && window.naver.maps.Service && window.naver.maps.Service.geocode) {
            initializeMap();
        } else {
            // If not, load the script with the geocoder submodule
            const scriptId = 'naver-map-geocoder-script';
            if (document.getElementById(scriptId)) {
                // If script already exists, just call initializeMap (it should be loaded)
                initializeMap();
                return;
            }

            const script = document.createElement('script');
            script.id = scriptId;
            // Add submodules=geocoder
            script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}&submodules=geocoder`;
            script.async = true;
            script.onload = () => initializeMap();
            script.onerror = () => console.error("Naver Map Geocoder Script Load Failed");
            document.head.appendChild(script);
        }

    }, [isLoaded, restaurants, isExpanded]); // isLoaded ensures base script is there before trying to load submodules

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
