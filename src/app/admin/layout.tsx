import { getCurrentStaff } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();

  // If no staff session (e.g. user is on /admin/login), render children directly without the admin shell.
  // Protection for other /admin routes is enforced by src/middleware.ts.
  if (!staff) {
    return <>{children}</>;
  }

  // Fetch full staff record for name
  const { data: staffRow } = await supabase
    .from('staff_users')
    .select('id, name, email, role')
    .eq('id', staff.id)
    .single();

  const name = staffRow?.name || staff.email.split('@')[0];
  const role = staffRow?.role || staff.role;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        staffEmail={staff.email}
        staffRole={role}
        staffName={name}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top spacer for mobile hamburger */}
        <div className="h-12 lg:hidden flex-shrink-0" />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
