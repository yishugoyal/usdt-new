import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// ─── Permission Constants ────────────────────────────────────────────────────

export const PERMISSIONS = {
  VIEW_USERS: 'VIEW_USERS',
  EDIT_USERS: 'EDIT_USERS',
  ADJUST_BALANCE: 'ADJUST_BALANCE',
  VIEW_ORDERS: 'VIEW_ORDERS',
  PROCESS_ORDERS: 'PROCESS_ORDERS',
  VIEW_DEPOSITS: 'VIEW_DEPOSITS',
  PROCESS_DEPOSITS: 'PROCESS_DEPOSITS',
  VIEW_WITHDRAWALS: 'VIEW_WITHDRAWALS',
  PROCESS_WITHDRAWALS: 'PROCESS_WITHDRAWALS',
  VIEW_TRANSACTIONS: 'VIEW_TRANSACTIONS',
  MANAGE_RATES: 'MANAGE_RATES',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_STAFF: 'MANAGE_STAFF',
  VIEW_STAFF: 'VIEW_STAFF',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  VIEW_COMPLIANCE: 'VIEW_COMPLIANCE',
  MANAGE_COMPLIANCE: 'MANAGE_COMPLIANCE',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ─── Role → Permissions Map ──────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS) as Permission[],
  ADMIN: [
    PERMISSIONS.VIEW_USERS, PERMISSIONS.EDIT_USERS, PERMISSIONS.ADJUST_BALANCE,
    PERMISSIONS.VIEW_ORDERS, PERMISSIONS.PROCESS_ORDERS,
    PERMISSIONS.VIEW_DEPOSITS, PERMISSIONS.PROCESS_DEPOSITS,
    PERMISSIONS.VIEW_WITHDRAWALS, PERMISSIONS.PROCESS_WITHDRAWALS,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.MANAGE_RATES, PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_STAFF, PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_COMPLIANCE, PERMISSIONS.MANAGE_COMPLIANCE,
  ],
  OPERATIONS: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ORDERS, PERMISSIONS.PROCESS_ORDERS,
    PERMISSIONS.VIEW_DEPOSITS, PERMISSIONS.PROCESS_DEPOSITS,
    PERMISSIONS.VIEW_WITHDRAWALS, PERMISSIONS.PROCESS_WITHDRAWALS,
    PERMISSIONS.VIEW_TRANSACTIONS,
  ],
  COMPLIANCE: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_COMPLIANCE, PERMISSIONS.MANAGE_COMPLIANCE,
  ],
  FINANCE: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.MANAGE_RATES,
  ],
  SUPPORT: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.VIEW_DEPOSITS,
    PERMISSIONS.VIEW_WITHDRAWALS,
    PERMISSIONS.VIEW_TRANSACTIONS,
  ],
};

// ─── Public Helpers ──────────────────────────────────────────────────────────

export function normalizeRole(role: string): string {
  if (!role) return 'SUPPORT';
  const clean = role.trim().toUpperCase().replace(/[\s-]/g, '_');
  if (clean === 'SUPERADMIN' || clean === 'SUPER_ADMIN' || clean === 'ROOT' || clean === 'OWNER') return 'SUPER_ADMIN';
  if (clean === 'ADMIN' || clean === 'ADMINISTRATOR') return 'ADMIN';
  if (clean === 'OPERATIONS' || clean === 'OPS') return 'OPERATIONS';
  if (clean === 'COMPLIANCE') return 'COMPLIANCE';
  if (clean === 'FINANCE') return 'FINANCE';
  if (clean === 'SUPPORT') return 'SUPPORT';
  return clean;
}

export function hasPermission(role: string, permission: Permission, email?: string): boolean {
  // Master admin account always has all permissions
  if (email && email.toLowerCase() === 'admin@rupeebridge.com') {
    return true;
  }
  const normalized = normalizeRole(role);
  if (normalized === 'SUPER_ADMIN') {
    return true;
  }
  const perms = ROLE_PERMISSIONS[normalized] ?? [];
  return perms.includes(permission);
}

export function getRolePermissions(role: string): Permission[] {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized] ?? [];
}

// ─── Staff Context Type ──────────────────────────────────────────────────────

export type StaffContext = { id: string; email: string; role: string };

// ─── Auth Guards ─────────────────────────────────────────────────────────────

export async function requireStaff(): Promise<StaffContext | NextResponse> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json(
      { error: 'Unauthorized. Staff authentication required.' },
      { status: 401 }
    );
  }
  return staff;
}

export async function requirePermission(
  permission: Permission,
  req?: Request
): Promise<StaffContext | NextResponse> {
  const staffOrRes = await requireStaff();
  if (staffOrRes instanceof NextResponse) return staffOrRes;

  const staff = staffOrRes as StaffContext;
  if (!hasPermission(staff.role, permission, staff.email)) {
    await logAudit(
      staff,
      'PERMISSION_DENIED',
      'API',
      null,
      { requiredPermission: permission, staffRole: staff.role }
    );
    return NextResponse.json(
      { error: `Access denied. Required permission: ${permission}` },
      { status: 403 }
    );
  }
  return staff;
}

// ─── Audit Logging ──────────────────────────────────────────────────────────

export async function logAudit(
  staff: StaffContext,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      staffId: staff.id,
      actorType: 'STAFF',
      actorId: staff.id,
      action,
      entityType,
      entityId: entityId ?? null,
      details: JSON.stringify({
        ...details,
        performedBy: staff.email,
        role: staff.role,
      }),
      ipAddress: ipAddress ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Audit log failures must never crash the main operation
    console.error('[AuditLog] Failed to write audit entry:', err);
  }
}

// ─── Sanitize User (never return passwordHash) ───────────────────────────────

export function sanitizeUser(user: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, mfaSecret, ...safe } = user;
  return safe;
}

// ─── Sanitize Staff (never return passwordHash/mfaSecret) ───────────────────

export function sanitizeStaff(staff: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, mfaSecret, ...safe } = staff;
  return safe;
}
