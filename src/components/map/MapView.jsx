import React, { useEffect, useRef, useState } from 'react';
import { NAVER_MAP_CLIENT_ID } from '../../constants';
import './MapView.css';

const MapView = ({ restaurants, isExpanded, onToggle, onMarkerClick }) => {
    const iframeRef = useRef(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Initial Load - Listen for Map Ready message
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'MAP_READY') {
                setIsMapReady(true);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Send Data to Iframe when Ready or Data Changes
    useEffect(() => {
        if (isMapReady && iframeRef.current) {
            // Sort restaurants for consistent numbering
            const sortedRestaurants = [...(restaurants || [])].sort((a, b) =>
                ((b.likes || 0) - (b.dislikes || 0)) - ((a.likes || 0) - (a.dislikes || 0))
            );

            setTimeout(() => {
                // Double Safety Check inside timeout
                if (mapInstance.current && markers.current.length > 0 && window.naver && window.naver.maps) {
                    // Optional: re-fit bounds? 
                    // Usually keeping current center is better, or re-fit if wanted.
                    // Let's re-fit if it was expanded from collapsed state
                    if (isExpanded && restaurants.length > 0) {
                        try {
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
                        } catch (resizeErr) {
                            console.warn("Resize fitBounds error:", resizeErr);
                        }
                    }
                }
            }, 300);
        } catch (resizeTriggerErr) {
            console.error("Map Resize Error:", resizeTriggerErr);
        }
    }, [isExpanded, restaurants]);

    // Only render if expanded (toggled from parent)
    if (!isExpanded) return null;

    return (
        <div className="map-container expanded">
            <div className="naver-map" ref={mapRef} />
        </div>
    );
};

export default MapView;
