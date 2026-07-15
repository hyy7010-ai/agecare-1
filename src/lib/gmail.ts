import { getAccessToken, googleSignIn } from './auth';

export async function sendGmailReport(to: string, subject: string, bodyText: string) {
  let token = await getAccessToken();
  if (!token) {
    const res = await googleSignIn();
    if (res) {
      token = res.accessToken;
    }
  }

  if (!token) {
    throw new Error('User not authenticated with Google');
  }

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    '',
    bodyText,
  ].join('\r\n');

  // Base64url encode the message
  const base64EncodedEmail = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64EncodedEmail,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Failed to send email: ${errorData?.error?.message || response.statusText}`);
  }

  return await response.json();
}
