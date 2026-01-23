import { Request, Response } from 'express';
import axios from 'axios';
import { User } from '../models/User';
import { createCanvas, loadImage } from 'canvas';

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

    const { draftId } = req.query;
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/callback`;

    // Scopes needed for Google Forms + Sheets (using drive.file with Picker instead of drive.readonly)
    const scopes = [
        'https://www.googleapis.com/auth/forms.body.readonly', // Read form structure
        'https://www.googleapis.com/auth/spreadsheets',         // Create/edit spreadsheets
        'https://www.googleapis.com/auth/drive.file'            // Access files selected via Picker
    ].join(' ');

    // Create state with userId and draftId
    const stateData = {
        // @ts-ignore
        userId: req.user.id,
        draftId: draftId || null
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('access_type', 'offline'); // Get refresh token
    url.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
    url.searchParams.set('state', state);

    res.json({ url: url.toString() });
};

// Handle Google Forms OAuth callback
export const googleFormsCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query;

    let baseRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events/create`;

    if (!code || !state) {
        return res.redirect(`${baseRedirect}?error=missing_params`);
    }

    try {
        const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/callback`;

        // Decode state
        const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString());
        const { userId, draftId } = decodedState;

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

        // Determine redirect URL
        let finalRedirect = `${baseRedirect}?googleFormsConnected=true`;
        if (draftId) {
            finalRedirect += `&draftId=${draftId}`;
        }

        // Redirect back to form builder
        res.redirect(finalRedirect);
    } catch (error) {
        console.error('Google Forms callback error:', error);
        res.redirect(`${baseRedirect}?error=auth_failed`);
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

// Helper to download image and convert to base64 (with resizing)
const downloadImageAsBase64 = async (url: string): Promise<string | null> => {
    if (!url) return null;
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000
        });

        // Resize image using canvas to avoid hitting MongoDB 16MB limit
        try {
            const buffer = Buffer.from(response.data);
            const img = await loadImage(buffer);

            const MAX_DIM = 800;
            let width = img.width;
            let height = img.height;

            if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                    height = Math.round(height * (MAX_DIM / width));
                    width = MAX_DIM;
                } else {
                    width = Math.round(width * (MAX_DIM / height));
                    height = MAX_DIM;
                }
            }

            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Return optimized JPEG
            return canvas.toDataURL('image/jpeg', 0.7);
        } catch (resizeError) {
            console.warn('Image resize failed, falling back to original:', resizeError);
            // Fallback to original if resize fails
            const contentType = response.headers['content-type'] || 'image/jpeg';
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            return `data:${contentType};base64,${base64}`;
        }
    } catch (error) {
        console.error('Failed to download Google Form image:', error);
        return null;
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

        // Convert Google Form to our format (Async now)
        const convertedQuestions = await convertGoogleFormToOurFormat(googleForm);

        // Try to extract banner/header image if present
        // NOTE: The Google Forms API does NOT expose the theme header image set via "Customize theme".
        // Only inline images added as form content items can be retrieved.
        let bannerImageUrl = null;

        // Check if first item is a standalone image without title (could be used as banner)
        if (googleForm.items?.[0]?.imageItem?.image) {
            const firstItem = googleForm.items[0];
            // Only treat as header if it has no title (pure decorative banner)
            if (!firstItem.title || firstItem.title === '') {
                bannerImageUrl = firstItem.imageItem.image.contentUri ||
                    firstItem.imageItem.image.sourceUri || null;

                // Remove this from questions since we're using it as banner
                if (bannerImageUrl && convertedQuestions.length > 0 &&
                    convertedQuestions[0].id.includes(firstItem.itemId)) {
                    convertedQuestions.shift();
                }
            }
        }

        let bannerImage = null;
        if (bannerImageUrl) {
            bannerImage = await downloadImageAsBase64(bannerImageUrl);
        } else {
            console.log('No banner image URL found in form');
        }

        res.json({
            title: googleForm.info?.title || 'Untitled Form',
            description: googleForm.info?.description || '',
            bannerImage: bannerImage,
            questions: convertedQuestions,
            originalForm: googleForm // Include original for debugging
        });
    } catch (error: any) {
        console.error('Get Google Form error:', error.response?.data || error);

        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || 'Failed to fetch Google Form';

        res.status(status).json({ message });
    }
};

// Convert Google Form format to our FormItem format
async function convertGoogleFormToOurFormat(googleForm: any): Promise<any[]> {
    const items: any[] = [];

    if (!googleForm.items) return items;

    for (const item of googleForm.items) {
        // Handle Image Items (standalone images in the form)
        if (item.imageItem) {
            const imageItem = item.imageItem;
            const imgUrl = imageItem.image?.contentUri || imageItem.image?.sourceUri || null;
            let base64Img = null;
            if (imgUrl) {
                base64Img = await downloadImageAsBase64(imgUrl);
            }

            // Use new content type format for images
            items.push({
                id: `content-${item.itemId}`,
                itemType: 'content',
                label: item.title || 'Image',
                contentType: 'image',
                contentUrl: base64Img || '',
                contentAlt: item.description || '',
                description: item.description || ''
            });
            continue;
        }

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

        // Handle Text Items (standalone title/description blocks)
        if (item.textItem) {
            items.push({
                id: `content-${item.itemId}`,
                itemType: 'content',
                label: item.title || 'Text Block',
                contentType: 'title',
                contentText: item.title || '',
                description: item.description || ''
            });
            continue;
        }

        // Handle Questions
        if (item.questionItem) {
            const question = item.questionItem.question;
            const questionImage = item.questionItem.image;

            const baseItem: any = {
                id: `q-${item.itemId}`,
                itemType: 'question',
                label: item.title || 'Question',
                description: item.description || '',
                required: question?.required || false
            };

            // Add image if present in question
            if (questionImage) {
                const qImgUrl = questionImage.contentUri || questionImage.sourceUri || null;
                if (qImgUrl) {
                    const qBase64 = await downloadImageAsBase64(qImgUrl);
                    if (qBase64) {
                        baseItem.hasImage = true;
                        baseItem.imageUrl = qBase64;
                    }
                }
            }

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

                const options = choiceQuestion.options?.map((opt: any) => opt.value).filter((v: any) => v && typeof v === 'string') || ['Option 1'];
                if (options.length === 0) options.push('Option 1'); // Ensure at least one option

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
            // File Upload Question
            else if (question?.fileUploadQuestion) {
                items.push({
                    ...baseItem,
                    type: 'file',
                    fileSettings: {
                        maxSizeMB: 10, // Default to 10MB
                        acceptedTypes: [] // Any
                    }
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

        // Handle Video Items - use new content type format
        if (item.videoItem) {
            const videoItem = item.videoItem;
            const youtubeUrl = videoItem.video?.youtubeUri || '';
            items.push({
                id: `content-${item.itemId}`,
                itemType: 'content',
                label: item.title || 'Video',
                contentType: 'video',
                contentUrl: youtubeUrl,
                description: item.description || ''
            });
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

// Get access token for Google Picker (used client-side)
export const getPickerToken = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const accessToken = await refreshAccessToken(userId);

        if (!accessToken) {
            return res.status(401).json({
                message: 'Google account not connected. Please connect your Google account first.',
                needsReconnect: true
            });
        }

        // Return the access token and client ID for the Picker
        res.json({
            accessToken,
            clientId: GOOGLE_CLIENT_ID,
            developerKey: process.env.GOOGLE_API_KEY || '' // Optional: for enhanced Picker features
        });
    } catch (error) {
        console.error('Get Picker token error:', error);
        res.status(500).json({ message: 'Failed to get Picker token' });
    }
};
