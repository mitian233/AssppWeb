/// <reference types="vite/client" />

import type { Account, Software } from '../../types';

const previewApp: Software = {
  id: 990000001,
  bundleID: 'invalid.asspp.signalcanvas',
  name: 'Signal Canvas',
  version: '3.4.1',
  price: 0,
  artistName: 'Copperline Studio',
  sellerName: 'Copperline Studio, Inc.',
  description:
    'A focused visual workspace for mapping systems, annotating releases, and sharing technical ideas with your team.',
  averageUserRating: 4.8,
  userRatingCount: 1842,
  artworkUrl: `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#075985" d="M0 0h512v512H0z"/><path fill="#22b8a8" d="M256 0h256v256H256z"/><path fill="#4338ca" d="M0 320 320 0h192L0 512z"/><g fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"><path d="M128 336V176h256v160H128Z"/><path d="m176 288 64-64 48 48 48-48"/></g></svg>',
  )}`,
  screenshotUrls: [],
  minimumOsVersion: '16.0',
  fileSizeBytes: '176160768',
  releaseDate: '2026-07-24T10:30:00Z',
  releaseNotes: 'Adds reusable system blocks, faster canvas search, and clearer export previews.',
  formattedPrice: 'Free',
  primaryGenreName: 'Developer Tools',
};

const previewAccounts: Account[] = [
  {
    email: 'developer@preview.asspp.invalid',
    password: 'preview-password.invalid',
    appleId: 'preview-apple-id.invalid',
    store: '143441',
    firstName: 'Avery',
    lastName: 'Chen',
    passwordToken: 'preview-token.invalid',
    directoryServicesIdentifier: 'preview-dsid.invalid',
    cookies: [],
    deviceIdentifier: 'DEADBEEFCAFE',
    pod: 'preview',
  },
];

export const previewProductApp: Software | null = import.meta.env.DEV ? previewApp : null;

export const previewProductAccounts: Account[] = import.meta.env.DEV ? previewAccounts : [];

export function isProductPreviewEnabled(search: string): boolean {
  if (!import.meta.env.DEV) return false;

  return new URLSearchParams(search).get('preview') === 'product';
}
