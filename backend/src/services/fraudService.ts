import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { logger } from '../lib/logger';

interface RiskAssessment {
    score: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
}

/**
 * Analyze payment for fraud risk
 */
export const analyzePaymentRisk = async (userId: string, amount: number, ipAddress: string, email: string): Promise<RiskAssessment> => {
    let score = 0;
    const reasons: string[] = [];

    try {
        const user = await User.findById(userId);

        // 1. New Account Check
        if (user && user.createdAt) {
            const accountAgeHours = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);
            if (accountAgeHours < 24) {
                score += 20;
                reasons.push('New Account (<24h)');
            }
        }

        // 2. High Value Transaction Check (Arbitrary threshold for now, e.g., > 10000 INR)
        if (amount > 10000) {
            score += 30;
            reasons.push('High Value Transaction');
        }

        // 3. Disposable Email Check (Basic list)
        const disposableDomains = ['tempmail.com', 'throwawaymail.com', 'mailinator.com', 'yopmail.com'];
        const domain = email.split('@')[1];
        if (disposableDomains.includes(domain)) {
            score += 50;
            reasons.push('Disposable Email Domain');
        }

        // 4. Payment Velocity (Many failures or attempts)
        // Check failed payments in last hour for this user/IP
        // Note: Payment model might not index IP, but we check user
        const recentFailures = await Payment.countDocuments({
            userId,
            status: 'failed',
            createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        });

        if (recentFailures > 2) {
            score += 15 * recentFailures;
            reasons.push(`High Failure Rate (${recentFailures} failed attempts)`);
        }

    } catch (error) {
        logger.error('fraud.analysis_error', { error: (error as Error).message });
    }

    // Determine Risk Level
    let riskLevel: RiskAssessment['riskLevel'] = 'low';
    if (score >= 90) riskLevel = 'critical';
    else if (score >= 60) riskLevel = 'high';
    else if (score >= 30) riskLevel = 'medium';

    return { score, riskLevel, reasons };
};
