// @ts-nocheck
import { Request, Response } from 'express';
// @ts-ignore
import { PKPass } from 'passkit-generator';
import jwt from 'jsonwebtoken';
import { Ticket } from '../models/Ticket';
import { Event } from '../models/Event';
import fs from 'fs';
import path from 'path';
import { checkFeatureAccess as checkPlanFeatureAccess } from '../services/planLimitService';

// --- Google Wallet Configuration ---
// In a real app, these should come from your Google Cloud Service Account
const GOOGLE_ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');
// Note: Google Private Key is usually multiline, needing replacement if stored in .env one-line

// --- Apple Wallet Configuration ---
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID;
// We expect certs in a 'certs' folder
const CERT_DIR = path.join(__dirname, '../../certs');

export const getApplePass = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId).populate('eventId');

        if (!ticket || !ticket.eventId) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const event = ticket.eventId as any;

        // Feature gating: Apple Wallet is a paid feature in plan config
        if (event?.hostId) {
            const appleWalletCheck = await checkPlanFeatureAccess(event.hostId.toString(), 'appleWalletPass');
            if (!appleWalletCheck.allowed) {
                return res.status(403).json({
                    message: appleWalletCheck.message,
                    feature: appleWalletCheck.feature,
                    upgradeRequired: appleWalletCheck.upgradeRequired,
                    code: 'FEATURE_NOT_AVAILABLE'
                });
            }
        }

        // Check for certificates
        const wwdrPath = path.join(CERT_DIR, 'wwdr.pem');
        const signerCertPath = path.join(CERT_DIR, 'signerCert.pem');
        const signerKeyPath = path.join(CERT_DIR, 'signerKey.pem');

        if (!fs.existsSync(wwdrPath) || !fs.existsSync(signerCertPath) || !fs.existsSync(signerKeyPath)) {
            console.warn('Apple Wallet certificates missing in', CERT_DIR);
            return res.status(503).json({
                message: 'Apple Wallet integration is not configured (Certificates missing).',
                details: 'Please add wwdr.pem, signerCert.pem, and signerKey.pem to backend/certs.'
            });
        }

        // Create Pass
        // @ts-ignore
        const pass = new PKPass(
            {
                model: path.join(CERT_DIR, 'event.pass'), // Template folder
                certificates: {
                    wwdr: fs.readFileSync(wwdrPath),
                    signerCert: fs.readFileSync(signerCertPath),
                    signerKey: fs.readFileSync(signerKeyPath),
                },
            },
            {
                serialNumber: ticket.qrCodeHash,
                webServiceURL: process.env.NEXT_PUBLIC_API_URL, // for updates
            }
        ) as any;

        // Customize Pass
        pass.type = 'eventTicket';
        pass.primaryFields.add({
            key: 'event',
            label: 'Event',
            value: event.title,
        });
        pass.secondaryFields.add({
            key: 'attendee',
            label: 'Attendee',
            value: ticket.guestName || 'Guest',
        });
        pass.auxiliaryFields.add({
            key: 'location',
            label: 'Location',
            value: event.location || 'Online',
        });
        pass.auxiliaryFields.add({
            key: 'date',
            label: 'Date',
            value: new Date(event.date).toLocaleDateString(),
        });
        pass.barcodes = [{
            format: 'PKBarcodeFormatQR',
            message: ticket.qrCodeHash,
            messageEncoding: 'iso-8859-1',
        }];

        const buffer = await pass.asBuffer();
        res.set('Content-Type', 'application/vnd.apple.pkpass');
        res.set('Content-Disposition', `attachment; filename=${event.slug}-ticket.pkpass`);
        res.send(buffer);

    } catch (error) {
        console.error('Apple Pass Error:', error);
        res.status(500).json({ message: 'Failed to generate Apple Pass' });
    }
};

export const getGoogleWalletLink = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const ticket = await Ticket.findById(ticketId).populate('eventId');

        if (!ticket || !ticket.eventId) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const event = ticket.eventId as any;

        if (!GOOGLE_ISSUER_ID || !GOOGLE_PRIVATE_KEY) {
            return res.status(503).json({
                message: 'Google Wallet integration is not configured.',
                details: 'Missing GOOGLE_WALLET_ISSUER_ID or GOOGLE_WALLET_PRIVATE_KEY in .env'
            });
        }

        // Define the Generic Object for Google Wallet
        // In reality, you should create a Class first via API, but we can try to use a generic one if pre-created
        // Or define the class inside the JWT payload itself (Google allows this for testing/simple cases)

        const classId = `${GOOGLE_ISSUER_ID}.${event.slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const objectId = `${GOOGLE_ISSUER_ID}.${ticket.qrCodeHash}`;

        const claims = {
            iss: process.env.GOOGLE_CLIENT_EMAIL, // Service Account Email
            aud: 'google',
            origins: [],
            typ: 'savetowallet',
            payload: {
                eventTicketClasses: [{
                    id: classId,
                    issuerName: "MakeTicket",
                    eventName: {
                        defaultValue: { language: "en-US", value: event.title }
                    },
                    reviewStatus: "UNDER_REVIEW" // Needed for testing without full approval
                }],
                eventTicketObjects: [{
                    id: objectId,
                    classId: classId,
                    state: "ACTIVE",
                    heroImage: {
                        sourceUri: {
                            uri: "https://your-logo-url.com/logo.png" // Replace with real logo
                        }
                    },
                    textModulesData: [
                        {
                            header: "Attendee",
                            body: ticket.guestName || "Guest",
                            id: "attendee_name"
                        },
                        {
                            header: "Location",
                            body: event.location || "Online",
                            id: "location"
                        }
                    ],
                    linksModuleData: {
                        uris: [
                            {
                                uri: `https://maketicket.app/validate?t=${ticket.qrCodeHash}`,
                                description: "Validate Ticket"
                            }
                        ]
                    },
                    barcode: {
                        type: "QR_CODE",
                        value: ticket.qrCodeHash
                    }
                }]
            }
        };

        const token = jwt.sign(claims, GOOGLE_PRIVATE_KEY, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        res.json({ url: saveUrl });

    } catch (error) {
        console.error('Google Wallet Error:', error);
        res.status(500).json({ message: 'Failed to generate Google Wallet link' });
    }
};
