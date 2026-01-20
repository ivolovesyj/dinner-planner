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

            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_MARKERS',
                payload: sortedRestaurants
            }, '*');
        }
    }, [isMapReady, restaurants]);

    return (
        <div className={`map-container ${isExpanded ? 'expanded' : ''}`}>
            {/* 
                Use Iframe to isolate Map from parent URL query parameters (?room=...).
                Naver Map API Auth often fails if the URL doesn't stick to the whitelist perfectly.
                Using a static HTML file relies on the clean path '/map.html'.
                Pass Client ID via HASH to avoid query string in the iframe URL itself.
            */}
            <iframe
                ref={iframeRef}
                name="naver-map-iso"
                src="/"
                title="Naver Map"
                style={{ width: '100%', height: '100%', border: 'none' }}
                loading="lazy"
            />
        </div>
    );
};

export default MapView;
