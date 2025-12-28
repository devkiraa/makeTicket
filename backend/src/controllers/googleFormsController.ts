import { Request, Response } from 'express';
import axios from 'axios';
import { User } from '../models/User';

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

        // Update user with new access token
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

// Check if user has Google Forms access
export const checkGoogleFormsAccess = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const user = await User.findById(userId);

        const scope = user?.googleTokens?.scope || '';
        const hasFormsScope = scope.includes('forms');
        const hasDriveScope = scope.includes('drive');
        const hasSheetsScope = scope.includes('spreadsheets');

        const hasAccess = !!(user?.googleTokens?.refreshToken && hasFormsScope);

        res.json({
            hasAccess,
            googleConnected: !!user?.googleId,
            formsScope: hasFormsScope,
            hasDriveAccess: hasDriveScope,
            hasSheetsAccess: hasSheetsScope
        });
    } catch (error) {
        console.error('Check Google Forms access error:', error);
        res.status(500).json({ message: 'Failed to check access' });
    }
};

// Get redirect URL to connect Google Forms
export const getGoogleFormsConnectUrl = (req: Request, res: Response) => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/callback`;

    // Scopes needed for Google Forms + Sheets
    const scopes = [
        'https://www.googleapis.com/auth/forms.body.readonly', // Read form structure
        'https://www.googleapis.com/auth/drive.readonly',       // List forms from Drive
        'https://www.googleapis.com/auth/spreadsheets',         // Create/edit spreadsheets
        'https://www.googleapis.com/auth/drive.file'            // Access app-created files
    ].join(' ');

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('access_type', 'offline'); // Get refresh token
    url.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
    // @ts-ignore
    url.searchParams.set('state', req.user.id); // Pass user ID in state

    res.json({ url: url.toString() });
};

// Handle Google Forms OAuth callback
export const googleFormsCallback = async (req: Request, res: Response) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events/create?error=missing_params`);
    }

    try {
        const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/callback`;

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

        // Update user with tokens
        await User.findByIdAndUpdate(userId, {
            googleTokens: {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt,
                scope
            }
        });

        // Redirect back to form builder
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events/create?googleFormsConnected=true`);
    } catch (error) {
        console.error('Google Forms callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events/create?error=auth_failed`);
    }
};

// List user's Google Forms
export const listGoogleForms = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const accessToken = await refreshAccessToken(userId);

        if (!accessToken) {
            return res.status(401).json({
                message: 'Google Forms not connected. Please connect your Google account.',
                needsAuth: true
            });
        }

        // Search for Google Forms in user's Drive
        const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
                q: "mimeType='application/vnd.google-apps.form'",
                fields: 'files(id,name,createdTime,modifiedTime,webViewLink)',
                orderBy: 'modifiedTime desc',
                pageSize: 50
            }
        });

        res.json({ forms: response.data.files || [] });
    } catch (error: any) {
        console.error('List Google Forms error:', error.response?.data || error);

        if (error.response?.status === 401) {
            return res.status(401).json({
                message: 'Google access expired. Please reconnect.',
                needsAuth: true
            });
        }

        res.status(500).json({ message: 'Failed to fetch Google Forms' });
    }
};

// Get a specific Google Form's structure
export const getGoogleForm = async (req: Request, res: Response) => {
    try {
        const { formId } = req.params;
        // @ts-ignore
        const userId = req.user.id;
        const accessToken = await refreshAccessToken(userId);

        if (!accessToken) {
            return res.status(401).json({
                message: 'Google Forms not connected',
                needsAuth: true
            });
        }

        // Fetch form structure from Google Forms API
        const response = await axios.get(`https://forms.googleapis.com/v1/forms/${formId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const googleForm = response.data;

        // Convert Google Form to our format
        const convertedQuestions = convertGoogleFormToOurFormat(googleForm);

        res.json({
            title: googleForm.info?.title || 'Untitled Form',
            description: googleForm.info?.description || '',
            questions: convertedQuestions,
            originalForm: googleForm // Include original for debugging
        });
    } catch (error: any) {
        console.error('Get Google Form error:', error.response?.data || error);
        res.status(500).json({ message: 'Failed to fetch Google Form' });
    }
};

// Convert Google Form format to our FormItem format
function convertGoogleFormToOurFormat(googleForm: any): any[] {
    const items: any[] = [];

    if (!googleForm.items) return items;

    for (const item of googleForm.items) {
        // Handle Page Break (Section)
        if (item.pageBreakItem) {
            items.push({
                id: `section-${item.itemId}`,
                itemType: 'section',
                label: item.title || 'Section',
                sectionDescription: item.description || ''
            });
            continue;
        }

        // Handle Questions
        if (item.questionItem) {
            const question = item.questionItem.question;
            const baseItem = {
                id: `q-${item.itemId}`,
                itemType: 'question',
                label: item.title || 'Question',
                description: item.description || '',
                required: question?.required || false
            };

            // Text question (short answer)
            if (question?.textQuestion) {
                items.push({
                    ...baseItem,
                    type: question.textQuestion.paragraph ? 'textarea' : 'text',
                    placeholder: ''
                });
            }
            // Choice question (radio, checkbox, dropdown)
            else if (question?.choiceQuestion) {
                const choiceQuestion = question.choiceQuestion;
                let type = 'radio';

                if (choiceQuestion.type === 'CHECKBOX') type = 'checkbox';
                else if (choiceQuestion.type === 'DROP_DOWN') type = 'select';

                const options = choiceQuestion.options?.map((opt: any) => opt.value) || ['Option 1'];

                items.push({
                    ...baseItem,
                    type,
                    options
                });
            }
            // Scale question (convert to radio)
            else if (question?.scaleQuestion) {
                const scale = question.scaleQuestion;
                const options = [];
                for (let i = scale.low || 1; i <= (scale.high || 5); i++) {
                    options.push(i.toString());
                }
                items.push({
                    ...baseItem,
                    type: 'radio',
                    options
                });
            }
            // Date question
            else if (question?.dateQuestion) {
                items.push({
                    ...baseItem,
                    type: 'date'
                });
            }
            // Time question
            else if (question?.timeQuestion) {
                items.push({
                    ...baseItem,
                    type: 'time'
                });
            }
            // Default to text for unknown types
            else {
                items.push({
                    ...baseItem,
                    type: 'text',
                    placeholder: ''
                });
            }
        }
    }

    return items;
}

// Disconnect Google Forms
export const disconnectGoogleForms = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        await User.findByIdAndUpdate(userId, {
            $unset: { googleTokens: 1 }
        });

        res.json({ message: 'Google Forms disconnected successfully' });
    } catch (error) {
        console.error('Disconnect Google Forms error:', error);
        res.status(500).json({ message: 'Failed to disconnect' });
    }
};
