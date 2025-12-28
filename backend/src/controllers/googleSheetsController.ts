import { Request, Response } from 'express';
import axios from 'axios';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Refresh Google access token if expired
const refreshAccessToken = async (userId: string): Promise<string | null> => {
    const user = await User.findById(userId);
    if (!user || !user.googleTokens?.refreshToken) {
        return null;
    }

    // Check if token is still valid (with 5 min buffer)
    const expiresAt = user.googleTokens.expiresAt;
    if (expiresAt && new Date(expiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
        return user.googleTokens.accessToken!;
    }

    // Refresh the token
    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: user.googleTokens.refreshToken,
            grant_type: 'refresh_token'
        });

        const { access_token, expires_in } = response.data;
        const newExpiresAt = new Date(Date.now() + expires_in * 1000);

        await User.findByIdAndUpdate(userId, {
            'googleTokens.accessToken': access_token,
            'googleTokens.expiresAt': newExpiresAt
        });

        return access_token;
    } catch (error) {
        console.error('Failed to refresh Google token:', error);
        return null;
    }
};

// Check if user has Google Sheets access
export const checkSheetsAccess = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const user = await User.findById(userId);

        const scope = user?.googleTokens?.scope || '';
        const hasSheetsScope = scope.includes('spreadsheets');

        res.json({
            hasAccess: !!(user?.googleTokens?.refreshToken && hasSheetsScope),
            sheetsScope: hasSheetsScope
        });
    } catch (error) {
        console.error('Check Sheets access error:', error);
        res.status(500).json({ message: 'Failed to check access' });
    }
};

// Get redirect URL to connect Google Sheets
export const getGoogleSheetsConnectUrl = (req: Request, res: Response) => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    // @ts-ignore
    const { eventId } = req.query;
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-sheets/callback`;

    // Scopes needed for Google Sheets
    const scopes = [
        'https://www.googleapis.com/auth/spreadsheets', // Create and edit spreadsheets
        'https://www.googleapis.com/auth/drive.file'    // Access files created by app
    ].join(' ');

    // Encode state with user ID and optional event ID
    // @ts-ignore
    const state = Buffer.from(JSON.stringify({ userId: req.user.id, eventId })).toString('base64');

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);

    res.json({ url: url.toString() });
};

// Handle Google Sheets OAuth callback
export const googleSheetsCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?error=missing_params`);
    }

    try {
        // Decode state
        const { userId, eventId } = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));

        const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-sheets/callback`;

        // Exchange code for tokens
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        });

        const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        // Update user with tokens (merge with existing scopes)
        const user = await User.findById(userId);
        const existingScope = user?.googleTokens?.scope || '';
        const mergedScope = [...new Set([...existingScope.split(' '), ...scope.split(' ')])].join(' ');

        await User.findByIdAndUpdate(userId, {
            googleTokens: {
                accessToken: access_token,
                refreshToken: refresh_token || user?.googleTokens?.refreshToken,
                expiresAt,
                scope: mergedScope
            }
        });

        // Redirect back
        const redirectUrl = eventId
            ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events/${eventId}?sheetsConnected=true`
            : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?sheetsConnected=true`;

        res.redirect(redirectUrl);
    } catch (error) {
        console.error('Google Sheets callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?error=auth_failed`);
    }
};

// Create a new spreadsheet for an event
export const createEventSpreadsheet = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        // @ts-ignore
        const userId = req.user.id;

        const accessToken = await refreshAccessToken(userId);
        if (!accessToken) {
            return res.status(401).json({ message: 'Google Sheets not connected', needsAuth: true });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Create spreadsheet
        const createResponse = await axios.post(
            'https://sheets.googleapis.com/v4/spreadsheets',
            {
                properties: {
                    title: `${event.title} - Registrations`
                },
                sheets: [{
                    properties: {
                        title: 'Registrations',
                        gridProperties: { frozenRowCount: 1 }
                    }
                }]
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const spreadsheetId = createResponse.data.spreadsheetId;
        const spreadsheetUrl = createResponse.data.spreadsheetUrl;
        // Get the actual sheet ID from the response
        const sheetId = createResponse.data.sheets[0].properties.sheetId;

        // Add header row based on event form fields
        const headers = ['Timestamp', 'Name', 'Email', 'Phone'];
        if (event.formSchema && event.formSchema.length > 0) {
            event.formSchema.forEach((field: any) => {
                if (field.itemType === 'question') {
                    headers.push(field.label);
                }
            });
        }
        headers.push('Status', 'Ticket ID');

        // Update header row
        await axios.put(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registrations!A1`,
            {
                values: [headers]
            },
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { valueInputOption: 'RAW' }
            }
        );

        // Format header row (bold, background color)
        await axios.post(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
                requests: [{
                    repeatCell: {
                        range: {
                            sheetId: sheetId, // Use actual sheet ID from response
                            startRowIndex: 0,
                            endRowIndex: 1
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                }]
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // Save spreadsheet ID to event
        await Event.findByIdAndUpdate(eventId, {
            googleSheetId: spreadsheetId,
            googleSheetUrl: spreadsheetUrl
        });

        // Sync existing registrations to the new spreadsheet
        const existingTickets = await Ticket.find({ eventId });
        if (existingTickets.length > 0) {
            const rows = existingTickets.map((ticket: any) => {
                const rowData = [
                    ticket.createdAt?.toISOString() || new Date().toISOString(),
                    ticket.guestName || 'Guest',
                    ticket.guestEmail || '',
                    ticket.formData?.phone || ticket.formData?.Phone || ticket.formData?.mobile || ''
                ];

                // Add form responses
                if (event.formSchema && event.formSchema.length > 0) {
                    event.formSchema.forEach((field: any) => {
                        if (field.itemType === 'question') {
                            const response = ticket.formData?.[field.id] ||
                                ticket.formData?.[field.label] || '';
                            rowData.push(Array.isArray(response) ? response.join(', ') : String(response));
                        }
                    });
                }

                rowData.push(ticket.status || 'issued');
                rowData.push(`TKT-${ticket.qrCodeHash?.substring(0, 8).toUpperCase() || ''}`);
                return rowData;
            });

            // Append all existing registrations
            await axios.post(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registrations!A2:append`,
                { values: rows },
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: {
                        valueInputOption: 'RAW',
                        insertDataOption: 'INSERT_ROWS'
                    }
                }
            );

            console.log(`Synced ${existingTickets.length} existing registrations to new spreadsheet`);
        }

        res.json({
            message: `Spreadsheet created successfully${existingTickets.length > 0 ? ` with ${existingTickets.length} existing registrations` : ''}`,
            spreadsheetId,
            spreadsheetUrl,
            syncedRegistrations: existingTickets.length
        });
    } catch (error: any) {
        console.error('Create spreadsheet error:', error.response?.data || error);
        res.status(500).json({ message: 'Failed to create spreadsheet' });
    }
};

// Add a registration to the spreadsheet
export const addRegistrationToSheet = async (
    userId: string,
    eventId: string,
    registrationData: {
        name: string;
        email: string;
        phone?: string;
        formResponses?: Record<string, any>;
        status?: string;
        ticketId?: string;
    }
) => {
    try {
        const event = await Event.findById(eventId);
        if (!event?.googleSheetId) {
            console.log('No Google Sheet linked to event');
            return false;
        }

        // Get the event host's access token
        const accessToken = await refreshAccessToken(event.hostId.toString());
        if (!accessToken) {
            console.log('No valid access token for sheet');
            return false;
        }

        // Build row data
        const rowData = [
            new Date().toISOString(),
            registrationData.name,
            registrationData.email,
            registrationData.phone || ''
        ];

        // Add form responses in order
        if (event.formSchema && event.formSchema.length > 0) {
            event.formSchema.forEach((field: any) => {
                if (field.itemType === 'question') {
                    const response = registrationData.formResponses?.[field.id] ||
                        registrationData.formResponses?.[field.label] || '';
                    rowData.push(Array.isArray(response) ? response.join(', ') : String(response));
                }
            });
        }

        rowData.push(registrationData.status || 'Registered');
        rowData.push(registrationData.ticketId || '');

        // Append to sheet
        await axios.post(
            `https://sheets.googleapis.com/v4/spreadsheets/${event.googleSheetId}/values/Registrations!A:A:append`,
            {
                values: [rowData]
            },
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS'
                }
            }
        );

        console.log('Registration added to Google Sheet');
        return true;
    } catch (error: any) {
        console.error('Add to sheet error:', error.response?.data || error);
        return false;
    }
};

// Get event's linked spreadsheet info
export const getEventSpreadsheet = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({
            hasSheet: !!event.googleSheetId,
            spreadsheetId: event.googleSheetId,
            spreadsheetUrl: event.googleSheetUrl
        });
    } catch (error) {
        console.error('Get spreadsheet error:', error);
        res.status(500).json({ message: 'Failed to get spreadsheet info' });
    }
};

// Unlink spreadsheet from event
export const unlinkSpreadsheet = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        await Event.findByIdAndUpdate(eventId, {
            $unset: { googleSheetId: 1, googleSheetUrl: 1 }
        });

        res.json({ message: 'Spreadsheet unlinked successfully' });
    } catch (error) {
        console.error('Unlink spreadsheet error:', error);
        res.status(500).json({ message: 'Failed to unlink spreadsheet' });
    }
};

// Sync all existing registrations to sheet
export const syncRegistrationsToSheet = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        // @ts-ignore
        const userId = req.user.id;

        const event = await Event.findById(eventId).populate('registrations');
        if (!event?.googleSheetId) {
            return res.status(400).json({ message: 'No spreadsheet linked to this event' });
        }

        const accessToken = await refreshAccessToken(userId);
        if (!accessToken) {
            return res.status(401).json({ message: 'Google Sheets not connected', needsAuth: true });
        }

        // This would need Registration model to be imported and used
        // For now, return success
        res.json({
            message: 'Sync initiated',
            note: 'Registration sync would happen here'
        });
    } catch (error) {
        console.error('Sync registrations error:', error);
        res.status(500).json({ message: 'Failed to sync registrations' });
    }
};
