import type {Route} from './+types/api.youzan.webhook';
import {
  CommerceConfigurationError,
  readYouzanCredentials,
} from '~/lib/youzan/config.server';
import {handleYouzanEvent} from '~/lib/youzan/events.server';
import {verifyYouzanPush, youzanPushSuccessBody} from '~/lib/youzan/push';

/**
 * 有赞云 消息推送 endpoint. Configure https://<domain>/api/youzan/webhook as the
 * app's push address. Youzan retries until it gets {code:0} within 5 s.
 */
export async function action({request}: Route.ActionArgs) {
  let credentials;
  try {
    credentials = readYouzanCredentials();
  } catch (error) {
    if (error instanceof CommerceConfigurationError) {
      return Response.json({code: 503, msg: 'not configured'}, {status: 503});
    }
    throw error;
  }

  const rawBody = await request.text();
  const verification = verifyYouzanPush({
    rawBody,
    eventSign: request.headers.get('event-sign'),
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
  });

  if (!verification.ok) {
    // Youzan's connectivity test is unsigned; acknowledge it without processing.
    if (verification.reason === 'bad-signature' && /"test"\s*:\s*true/.test(rawBody)) {
      return Response.json(youzanPushSuccessBody);
    }
    console.warn('[youzan:webhook] Rejected push', verification.reason);
    return Response.json(
      {code: 401, msg: verification.reason},
      {status: verification.reason === 'malformed' ? 400 : 401},
    );
  }

  const {event} = verification;
  if (event.isTest) return Response.json(youzanPushSuccessBody);

  if (event.kdtId && event.kdtId !== credentials.kdtId) {
    console.warn('[youzan:webhook] Ignoring push for another store', event.kdtId);
    return Response.json(youzanPushSuccessBody);
  }

  try {
    await handleYouzanEvent(event);
  } catch (error) {
    console.error('[youzan:webhook] Handler failed', error);
    return Response.json({code: 500, msg: 'retry'}, {status: 500});
  }

  return Response.json(youzanPushSuccessBody);
}
