'use client';

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

interface EarthMapProps {
    locations: { lat: number, lon: number, size: number, status?: string }[];
}

export function EarthMap({ locations }: EarthMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let phi = 0;

        // Map standard markers
        const markers = locations?.map(loc => {
            // Determine color based on status if provided, else default neon blue
            let color: [number, number, number] = [0.1, 0.8, 1]; // Active/Default
            if (loc.status === 'suspended') color = [1, 0.2, 0.2]; // Suspended/Inactive

            return {
                location: [loc.lat, loc.lon] as [number, number],
                size: Math.min(loc.size * 0.5, 0.1) || 0.05,
            };
        }) || [];

        if (!canvasRef.current) return;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: 800 * 2,
            height: 800 * 2,
            phi: 0,
            theta: 0,
            dark: 0, // Using dark mode internally looks beautiful
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 4,
            baseColor: [1, 1, 1], // Slate-ish
            markerColor: [0.25, 0.46, 0.92], // Indigo-500
            glowColor: [0.8, 0.8, 1],
            markers,
            onRender: (state) => {
                state.phi = phi;
                phi += 0.005;
            },
        });

        return () => {
            globe.destroy();
        };
    }, [locations]);

    return (
        <div style={{ width: '100%', maxWidth: 800, aspectRatio: 1, margin: "auto", position: "relative" }}>
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", contain: "layout paint size", opacity: 0.9 }}
            />
            {locations.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-400 text-sm font-medium">No location data available for selected filter</p>
                </div>
            )}
        </div>
    );
}
