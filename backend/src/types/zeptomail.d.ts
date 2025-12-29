declare module 'zeptomail' {
    export class SendMailClient {
        constructor(options: { url: string; token: string });
        
        sendMail(options: {
            from: {
                address: string;
                name: string;
            };
            to: Array<{
                email_address: {
                    address: string;
                    name: string;
                };
            }>;
            cc?: Array<{
                email_address: {
                    address: string;
                    name: string;
                };
            }>;
            bcc?: Array<{
                email_address: {
                    address: string;
                    name: string;
                };
            }>;
            reply_to?: Array<{
                address: string;
                name?: string;
            }>;
            subject: string;
            htmlbody?: string;
            textbody?: string;
            track_clicks?: boolean;
            track_opens?: boolean;
            client_reference?: string;
            mime_headers?: Record<string, string>;
            attachments?: Array<{
                content: string;
                mime_type: string;
                name: string;
                content_id?: string;
            }>;
            inline_images?: Array<{
                content: string;
                mime_type: string;
                cid: string;
            }>;
        }): Promise<{
            request_id: string;
            data: Array<{
                code: string;
                additional_info: string[];
                message: string;
            }>;
            message: string;
        }>;
    }
}
