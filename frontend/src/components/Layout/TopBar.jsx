import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../UI/Avatar';
import { Menu, Bell } from 'lucide-react';

const TopBar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Simple breadcrumb logic based on pathname
  let section = 'Overview';
  let page = 'Dashboard';

  const path = location.pathname.split('/').filter(Boolean);
  if (path.length > 0) {
    if (path[0] === 'hr') section = 'HR Admin';
    else if (path[0] === 'manager') section = 'Manager';
    else if (path[0] === 'employee') section = 'Employee';

    if (path[1]) {
      page = path[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        {/* hamburger — mobile only */}
        <button className="lg:hidden p-1 -ml-2 rounded-lg hover:bg-slate-100 transition-colors" onClick={onMenuClick}>
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        {/* breadcrumb */}
        <div className="hidden sm:block">
          <p className="text-xs text-slate-400 font-medium">{section}</p>
          <h1 className="text-base font-semibold text-slate-800 leading-tight">{page}</h1>
        </div>
        {/* Mobile Page Title */}
        <div className="sm:hidden">
           <h1 className="text-base font-semibold text-slate-800 leading-tight">{page}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* notification bell with dot */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        {/* avatar */}
        <Avatar name={user?.name || 'User'} size="sm" />
      </div>
    </header>
  );
};

export default TopBar;
