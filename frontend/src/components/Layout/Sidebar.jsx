import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPendingRequests } from '../../api/leave.api';
import Avatar from '../UI/Avatar';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Building2,
  BarChart3,
  FileText,
  LogOut,
  X
} from 'lucide-react';

const RoleBadge = ({ role }) => {
  if (role === 'employee') {
    return <span className="bg-indigo-900/50 text-indigo-300 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded">Employee</span>;
  }
  if (role === 'manager') {
    return <span className="bg-amber-900/50 text-amber-300 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded">Manager</span>;
  }
  if (role === 'hr_admin') {
    return <span className="bg-purple-900/50 text-purple-300 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded">HR Admin</span>;
  }
  return null;
};

const NAV_ITEMS = {
  employee: [
    { path: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employee/my-leaves', icon: Calendar, label: 'My Leaves' },
    { path: '/employee/holidays', icon: FileText, label: 'Holidays' },
  ],
  manager: [
    { path: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/manager/my-leaves', icon: Calendar, label: 'My Leaves' },
    { path: '/manager/approvals', icon: ClipboardList, label: 'Approvals', badgeKey: 'approvals' },
    { path: '/manager/holidays', icon: FileText, label: 'Holidays' },
  ],
  hr_admin: [
    { path: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/hr/employees', icon: Users, label: 'Employees' },
    { path: '/hr/departments', icon: Building2, label: 'Departments' },
    { path: '/hr/leave-reports', icon: BarChart3, label: 'Leave Reports' },
    { path: '/hr/balances', icon: BarChart3, label: 'Employee Balances' },
    { path: '/hr/holidays', icon: FileText, label: 'Holidays' },
  ],
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  const role = user?.role || 'employee';
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.employee;

  useEffect(() => {
    if (role === 'manager') {
      getPendingRequests()
        .then((data) => setPendingCount(data.length))
        .catch(() => {});
    }
  }, [role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <aside className="w-64 flex-shrink-0 h-screen bg-slate-900 flex flex-col overflow-y-auto transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-base tracking-tight">
          LeaveDesk
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const badgeValue = item.badgeKey === 'approvals' ? pendingCount : 0;
          return (
            <NavLink key={item.path} to={item.path} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{item.label}</span>
              {badgeValue > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {badgeValue}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
          <Avatar name={user?.name || 'User'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <RoleBadge role={role} />
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Drawer (Overlay + Sidebar) */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer body */}
          <div className="relative z-10 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
