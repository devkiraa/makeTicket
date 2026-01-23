'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import React from 'react';

export const CaptchaProvider = ({ children, nonce }: { children: React.ReactNode; nonce?: string }) => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
        // If no key (dev mode probably), render children without provider
        return <>{children}</>;
    }

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={siteKey}
            scriptProps={{
                async: false,
                defer: false,
                appendTo: 'head',
                nonce: nonce,
            }}
        >
            {children}
        </GoogleReCaptchaProvider>
    );
};
