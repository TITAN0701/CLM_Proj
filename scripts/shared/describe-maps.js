/**
 * describe-maps.js
 * 所有 describe 名稱 → feature/URL 對照表的單一來源
 * 由 run-cypress.js / auto-fix.js 共同 require()
 */

// describe 名稱 → pipeline-state feature key
const DESCRIBE_TO_FEATURE = {
  'CA 機構管理':   'CA 機構',
  'ACME 帳號':     'ACME 帳號',
  'Account 詳細':  'Account 詳細',
  'DNS 機構':      'DNS 機構',
  '儀表板':        '儀表板',
  '憑證列表':      '憑證列表',
  '我的帳號':      '我的帳號',
  '稽核紀錄':      '稽核紀錄',
  '合規政策':      '合規政策',
  '系統設定':      '系統設定',
  'Group 管理':    'Group 管理',
  'User 管理':     'User 管理',
  '授權管理':      '授權管理',
  '部署核准':      '部署核准',
  '憑證掃描':      '憑證掃描',
  '申請新憑證':    '申請新憑證',
  'Endpoint 管理': 'Endpoint 管理',
  '匯入既有憑證':  '匯入既有憑證',
  '網域詳細':      '網域詳細',
  'Order 詳細':    'Order 詳細',
  '管理員使用者':  'User 管理',
  '稽核紀錄 — 權限控制': '稽核紀錄',
};

// describe 名稱 → 頁面 URL（用於殘留 TC 檢查與 auto-fix snapshot）
const DESCRIBE_TO_URL = {
  'CA 機構管理':   '/admin/providers',
  'ACME 帳號':     '/accounts',
  'Account 詳細':  '/accounts',
  'DNS 機構':      '/admin/dns-providers',
  '儀表板':        '/dashboard',
  '憑證列表':      '/certs',
  '我的帳號':      '/me',
  '稽核紀錄':      '/audit',
  '合規政策':      '/admin/policies',
  '系統設定':      '/admin/settings',
  'Group 管理':    '/admin/groups',
  'User 管理':     '/admin/users',
  '授權管理':      '/admin/license',
  '部署核准':      '/admin/approvals',
  '憑證掃描':      '/admin/scan',
  '申請新憑證':    '/certs/new',
  'Endpoint 管理': '/admin/endpoints',
  '匯入既有憑證':  '/certs/import',
  '網域詳細':      '/certs',
  'Order 詳細':    '/certs',
  '稽核紀錄 — 權限控制': '/audit',
};

// feature 中文名稱 → 頁面 URL（用於 Bug Report 產出）
const FEATURE_PAGE = {
  'CA 機構':    '/admin/ca-providers（CA 機構管理頁）',
  'ACME 帳號':  '/accounts（ACME 帳號列表頁）',
  'Account 詳細': '/accounts（帳號詳細頁）',
  'DNS 機構':   '/admin/dns-providers（DNS 機構管理頁）',
  '儀表板':     '/dashboard（儀表板）',
  '憑證列表':   '/certs（憑證列表頁）',
  '我的帳號':   '/me（我的帳號頁）',
  '稽核紀錄':   '/audit（稽核紀錄頁）',
  '合規政策':   '/admin/policies（合規政策頁）',
  '系統設定':   '/admin/settings（系統設定頁）',
  'Group 管理': '/admin/users（Group 管理頁）',
  'User 管理':  '/admin/users（User 管理頁）',
  '授權管理':   '/admin/license（授權管理頁）',
  '部署核准':   '/admin/approvals（部署核准頁）',
  '憑證掃描':   '/admin/scan（憑證掃描頁）',
  '申請新憑證': '/certs/new（申請新憑證頁）',
  'Endpoint 管理': '/admin/endpoints（Endpoint 管理頁）',
};

module.exports = { DESCRIBE_TO_FEATURE, DESCRIBE_TO_URL, FEATURE_PAGE };
