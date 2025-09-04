/**
 * Firebase Functions for Payment Processing
 * Handles gem purchases, revenue sharing, and financial transactions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

// Initialize Stripe
const stripe = new Stripe(functions.config().stripe?.secret_key || '', {
  apiVersion: '2023-10-16'
});

/**
 * Purchase gems with real money
 */
export const purchaseGems = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { packageId, paymentMethodId, userId } = data;

    if (!packageId || !paymentMethodId || !userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'packageId, paymentMethodId, and userId are required'
      );
    }

    // Verify user matches authenticated user
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User can only purchase gems for themselves'
      );
    }

    // Get gem package details
    const gemPackage = getGemPackage(packageId);
    if (!gemPackage) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid package ID'
      );
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(gemPackage.price * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        userId,
        packageId,
        gems: gemPackage.gems.toString(),
        bonus: gemPackage.bonus.toString()
      }
    });

    // Check if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      // Process successful payment
      const transactionId = await processGemPurchase(
        userId,
        packageId,
        gemPackage,
        paymentIntent.id
      );

      return {
        success: true,
        transactionId,
        gemsAdded: gemPackage.gems + gemPackage.bonus,
        paymentIntentId: paymentIntent.id
      };
    } else {
      throw new functions.https.HttpsError(
        'internal',
        'Payment failed'
      );
    }

  } catch (error: any) {
    console.error('Error processing gem purchase:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to process gem purchase'
    );
  }
});

/**
 * Handle Stripe webhook events
 */
export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = functions.config().stripe?.webhook_secret;

    if (!sig || !endpointSecret) {
      console.error('Missing Stripe signature or webhook secret');
      res.status(400).send('Missing signature or secret');
      return;
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    console.log(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.dispute.created':
        await handleChargeback(event.data.object as Stripe.Dispute);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Webhook handled');

  } catch (error: any) {
    console.error('Error handling Stripe webhook:', error);
    res.status(400).send(`Webhook error: ${error.message}`);
  }
});

/**
 * Process revenue sharing for streamers
 */
export const processRevenueSharing = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const yesterday = admin.firestore.Timestamp.fromMillis(
        Date.now() - 24 * 60 * 60 * 1000
      );

      // Get all completed gift transactions from yesterday
      const transactionsQuery = await db.collection('giftTransactions')
        .where('status', '==', 'completed')
        .where('createdAt', '>=', yesterday)
        .get();

      const revenueByHost = new Map<string, {
        hostId: string;
        totalRevenue: number;
        platformFee: number;
        hostEarnings: number;
        transactionCount: number;
      }>();

      // Aggregate revenue by host
      transactionsQuery.docs.forEach(doc => {
        const transaction = doc.data();
        const hostId = transaction.recipientId;
        
        const current = revenueByHost.get(hostId) || {
          hostId,
          totalRevenue: 0,
          platformFee: 0,
          hostEarnings: 0,
          transactionCount: 0
        };

        current.totalRevenue += transaction.goldValue;
        current.platformFee += transaction.platformFee;
        current.hostEarnings += transaction.recipientEarnings;
        current.transactionCount += 1;

        revenueByHost.set(hostId, current);
      });

      // Process payouts for each host
      const batch = db.batch();
      let processedHosts = 0;

      for (const [hostId, revenue] of revenueByHost) {
        // Only process payouts above minimum threshold
        if (revenue.hostEarnings >= 1000) { // 1000 gold minimum
          // Create payout record
          const payoutRef = db.collection('hostPayouts').doc();
          batch.set(payoutRef, {
            hostId,
            amount: revenue.hostEarnings,
            currency: 'gold',
            status: 'pending',
            period: {
              start: yesterday,
              end: admin.firestore.Timestamp.now()
            },
            transactionCount: revenue.transactionCount,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          processedHosts++;
        }
      }

      if (processedHosts > 0) {
        await batch.commit();
        console.log(`Processed revenue sharing for ${processedHosts} hosts`);
      }

      return { processedHosts, totalRevenue: Array.from(revenueByHost.values()).reduce((sum, r) => sum + r.totalRevenue, 0) };

    } catch (error) {
      console.error('Error processing revenue sharing:', error);
      throw error;
    }
  });

/**
 * Generate financial reports
 */
export const generateFinancialReport = functions.https.onCall(async (data, context) => {
  try {
    // Verify admin permissions
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    const { startDate, endDate, reportType } = data;

    if (!startDate || !endDate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'startDate and endDate are required'
      );
    }

    const start = admin.firestore.Timestamp.fromDate(new Date(startDate));
    const end = admin.firestore.Timestamp.fromDate(new Date(endDate));

    let report: any = {};

    switch (reportType) {
      case 'revenue':
        report = await generateRevenueReport(start, end);
        break;
      case 'transactions':
        report = await generateTransactionReport(start, end);
        break;
      case 'users':
        report = await generateUserReport(start, end);
        break;
      default:
        report = await generateComprehensiveReport(start, end);
    }

    return report;

  } catch (error: any) {
    console.error('Error generating financial report:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate financial report'
    );
  }
});

/**
 * Get gem package details
 */
function getGemPackage(packageId: string): any {
  const packages: { [key: string]: any } = {
    'gems_100': { gems: 100, price: 0.99, bonus: 0 },
    'gems_500': { gems: 500, price: 4.99, bonus: 50 },
    'gems_1000': { gems: 1000, price: 9.99, bonus: 150 },
    'gems_2500': { gems: 2500, price: 19.99, bonus: 500 },
    'gems_5000': { gems: 5000, price: 39.99, bonus: 1500 }
  };

  return packages[packageId] || null;
}

/**
 * Process successful gem purchase
 */
async function processGemPurchase(
  userId: string,
  packageId: string,
  gemPackage: any,
  paymentIntentId: string
): Promise<string> {
  try {
    const totalGems = gemPackage.gems + gemPackage.bonus;

    // Create transaction record
    const transactionRef = await db.collection('gemPurchases').add({
      userId,
      packageId,
      gemsBase: gemPackage.gems,
      gemsBonus: gemPackage.bonus,
      gemsTotal: totalGems,
      priceUsd: gemPackage.price,
      paymentIntentId,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user wallet
    const walletRef = db.doc(`userWallets/${userId}`);
    await walletRef.update({
      gems: admin.firestore.FieldValue.increment(totalGems),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Processed gem purchase: ${totalGems} gems for user ${userId}`);
    return transactionRef.id;

  } catch (error) {
    console.error('Error processing gem purchase:', error);
    throw error;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const { userId, packageId } = paymentIntent.metadata;
    
    if (!userId || !packageId) {
      console.error('Missing metadata in payment intent');
      return;
    }

    const gemPackage = getGemPackage(packageId);
    if (!gemPackage) {
      console.error('Invalid package ID in payment intent');
      return;
    }

    await processGemPurchase(userId, packageId, gemPackage, paymentIntent.id);

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const { userId, packageId } = paymentIntent.metadata;
    
    // Log failed payment
    await db.collection('gemPurchases').add({
      userId,
      packageId,
      paymentIntentId: paymentIntent.id,
      status: 'failed',
      failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Payment failed for user ${userId}: ${paymentIntent.last_payment_error?.message}`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle chargeback/dispute
 */
async function handleChargeback(dispute: Stripe.Dispute): Promise<void> {
  try {
    const paymentIntentId = dispute.payment_intent as string;
    
    // Find the original transaction
    const transactionQuery = await db.collection('gemPurchases')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (transactionQuery.empty) {
      console.error('No transaction found for disputed payment');
      return;
    }

    const transaction = transactionQuery.docs[0];
    const transactionData = transaction.data();

    // Deduct gems from user wallet
    const walletRef = db.doc(`userWallets/${transactionData.userId}`);
    await walletRef.update({
      gems: admin.firestore.FieldValue.increment(-transactionData.gemsTotal),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update transaction status
    await transaction.ref.update({
      status: 'disputed',
      disputeId: dispute.id,
      disputedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Processed chargeback for user ${transactionData.userId}: ${transactionData.gemsTotal} gems deducted`);

  } catch (error) {
    console.error('Error handling chargeback:', error);
  }
}

/**
 * Generate revenue report
 */
async function generateRevenueReport(start: admin.firestore.Timestamp, end: admin.firestore.Timestamp): Promise<any> {
  const purchasesQuery = await db.collection('gemPurchases')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .where('status', '==', 'completed')
    .get();

  const giftTransactionsQuery = await db.collection('giftTransactions')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .where('status', '==', 'completed')
    .get();

  const totalGemPurchases = purchasesQuery.docs.reduce((sum, doc) => sum + doc.data().priceUsd, 0);
  const totalGiftRevenue = giftTransactionsQuery.docs.reduce((sum, doc) => sum + doc.data().platformFee, 0);

  return {
    period: { start: start.toDate(), end: end.toDate() },
    gemPurchases: {
      count: purchasesQuery.size,
      revenue: totalGemPurchases
    },
    giftTransactions: {
      count: giftTransactionsQuery.size,
      platformRevenue: totalGiftRevenue
    },
    totalRevenue: totalGemPurchases + (totalGiftRevenue * 0.01) // Convert gold to USD estimate
  };
}

/**
 * Generate transaction report
 */
async function generateTransactionReport(start: admin.firestore.Timestamp, end: admin.firestore.Timestamp): Promise<any> {
  // Implementation would include detailed transaction analysis
  return {
    period: { start: start.toDate(), end: end.toDate() },
    summary: 'Transaction report generated'
  };
}

/**
 * Generate user report
 */
async function generateUserReport(start: admin.firestore.Timestamp, end: admin.firestore.Timestamp): Promise<any> {
  // Implementation would include user spending and earning analysis
  return {
    period: { start: start.toDate(), end: end.toDate() },
    summary: 'User report generated'
  };
}

/**
 * Generate comprehensive report
 */
async function generateComprehensiveReport(start: admin.firestore.Timestamp, end: admin.firestore.Timestamp): Promise<any> {
  const [revenueReport, transactionReport, userReport] = await Promise.all([
    generateRevenueReport(start, end),
    generateTransactionReport(start, end),
    generateUserReport(start, end)
  ]);

  return {
    revenue: revenueReport,
    transactions: transactionReport,
    users: userReport,
    generatedAt: new Date()
  };
}
