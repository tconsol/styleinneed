import admin from 'firebase-admin';
import { Types } from 'mongoose';
import User from '../models/User';
import Notification, { NotificationType } from '../models/Notification';
import { emitEvent } from '../config/socket';
import logger from '../utils/logger';

// Lazy Firebase init — only once, only when credentials are present
let firebaseReady = false;

function getMessaging(): admin.messaging.Messaging | null {
  if (firebaseReady) return admin.messaging();

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey      = process.env.FIREBASE_PRIVATE_KEY;

  // Skip if placeholder or missing
  if (!projectId || !clientEmail || !rawKey ||
      rawKey.includes('your_firebase') || rawKey.length < 100) {
    logger.warn('Firebase credentials not configured — push notifications disabled');
    return null;
  }

  try {
    const privateKey = rawKey.replace(/\\n/g, '\n');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    firebaseReady = true;
    return admin.messaging();
  } catch (err) {
    logger.error(`Firebase init failed: ${err}`);
    return null;
  }
}

export interface PushPayload {
  userId: Types.ObjectId | string;
  title: string;
  body: string;
  type: NotificationType;
  orderId?: string;
  orderNumber?: string;
}

/**
 * Persist notification to DB, emit socket event, and send FCM push if token exists.
 * All errors swallowed — push failures must never block the order flow.
 */
export const sendPushToUser = async (payload: PushPayload): Promise<void> => {
  const { userId, title, body, type, orderId, orderNumber } = payload;

  try {
    const notification = await Notification.create({ user: userId, title, body, type, orderId, orderNumber });
    emitEvent('notification:new', {
      userId: String(userId),
      notification: {
        _id: String(notification._id),
        title, body, type, orderId, orderNumber,
        isRead: false,
        createdAt: notification.createdAt,
      },
    });
  } catch (err) {
    logger.error(`Notification DB save failed: ${err}`);
  }

  // FCM push (fire-and-forget)
  try {
    const messaging = getMessaging();
    if (!messaging) return;

    const user = await User.findById(userId).select('pushToken');
    if (!user?.pushToken) return;

    await messaging.send({
      token: user.pushToken,
      notification: { title, body },
      data: {
        type,
        orderId: orderId ?? '',
        orderNumber: orderNumber ?? '',
      },
      android: {
        priority: 'high',
        notification: { channelId: 'default', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    logger.warn(`FCM push failed: ${code ?? err}`);
    // Clean up stale token
    if (code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token') {
      await User.findByIdAndUpdate(userId, { $unset: { pushToken: 1 } });
    }
  }
};

export interface BroadcastPayload {
  title: string;
  body: string;
  type: NotificationType;
  deepLink?: string;
}

/**
 * Send push notification to ALL users with a registered FCM token.
 * Creates in-app Notification records via insertMany, then batches FCM sends.
 */
export const sendBroadcastPush = async (payload: BroadcastPayload): Promise<{ sent: number; failed: number }> => {
  const { title, body, type, deepLink } = payload;

  // Fetch all users that have a push token
  const users = await User.find({ pushToken: { $exists: true, $ne: '' } })
    .select('_id pushToken')
    .lean();

  if (!users.length) return { sent: 0, failed: 0 };

  // Persist in-app notifications (bulk)
  try {
    await Notification.insertMany(
      users.map((u) => ({ user: u._id, title, body, type, isRead: false })),
      { ordered: false }
    );
  } catch (err) {
    logger.error(`Broadcast notification insertMany error: ${err}`);
  }

  // Send FCM in batches of 500 (Firebase limit)
  const messaging = getMessaging();
  const BATCH = 500;
  let sent = 0;
  let failed = 0;
  const staleTokenUserIds: string[] = [];

  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    const tokens = batch.map((u) => u.pushToken as string);

    if (!messaging) { failed += batch.length; continue; }

    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { type, deepLink: deepLink ?? '' },
        android: {
          priority: 'high',
          notification: { channelId: 'default', sound: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });

      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          sent++;
        } else {
          failed++;
          const code = resp.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            staleTokenUserIds.push(String(batch[idx]._id));
          }
        }
      });
    } catch (err) {
      logger.error(`FCM multicast batch ${i / BATCH} failed: ${err}`);
      failed += batch.length;
    }
  }

  // Clean up stale tokens in background
  if (staleTokenUserIds.length) {
    User.updateMany(
      { _id: { $in: staleTokenUserIds } },
      { $unset: { pushToken: 1 } }
    ).catch((err) => logger.error(`Stale token cleanup error: ${err}`));
  }

  return { sent, failed };
};

const STATUS_CONTENT: Record<string, { title: string; body: (num: string) => string; type: NotificationType }> = {
  confirmed:  { title: '✅ Order Confirmed',   body: (n) => `Your order #${n} is confirmed and being processed.`,       type: 'order_confirmed' },
  packed:     { title: '📦 Order Packed',       body: (n) => `Your order #${n} is packed and ready to ship.`,            type: 'order_status_changed' },
  shipped:    { title: '🚚 Order Shipped',      body: (n) => `Your order #${n} is on its way!`,                          type: 'order_shipped' },
  delivered:  { title: '🎉 Order Delivered',    body: (n) => `Your order #${n} has been delivered. Enjoy!`,              type: 'order_delivered' },
  cancelled:  { title: '❌ Order Cancelled',    body: (n) => `Your order #${n} has been cancelled.`,                    type: 'order_cancelled' },
  returned:   { title: '↩️ Return Processed',   body: (n) => `Return for order #${n} has been processed.`,              type: 'order_status_changed' },
};

export const getStatusPushContent = (
  status: string,
  orderNumber: string
): { title: string; body: string; type: NotificationType } => {
  const entry = STATUS_CONTENT[status];
  if (entry) return { title: entry.title, body: entry.body(orderNumber), type: entry.type };
  return { title: 'Order Update', body: `Your order #${orderNumber} status changed to ${status}.`, type: 'order_status_changed' };
};
