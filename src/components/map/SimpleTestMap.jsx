import React, { useEffect, useRef } from 'react';
import { NAVER_MAP_CLIENT_ID } from '../../constants';

const SimpleTestMap = () => {
    const mapElement = useRef(null);

    useEffect(() => {
        const scriptId = 'naver-map-script-simple';

        // 1. Script Load
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}`;
            script.async = true;
            script.onload = initMap;
            document.head.appendChild(script);
        } else {
            initMap();
        }

        function initMap() {
            // 2. Map Initialization (Bare Minimum)
            if (window.naver && mapElement.current) {
                new window.naver.maps.Map(mapElement.current, {
                    center: new window.naver.maps.LatLng(37.5665, 126.9780),
                    zoom: 15
                });
                console.log("Simple Map Initialized");
            }
        }
    }, []);

    return (
        <div
            ref={mapElement}
            style={{ width: '100%', height: '300px', background: '#eee' }}
        >
            loading map...
        </div>
    );
};

export default SimpleTestMap;
