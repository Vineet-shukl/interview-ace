import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BookOpen,
  Mic,
  Video,
  Calendar,
  BarChart3,
  History,
  Settings,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BookOpen, label: 'Question Library', path: '/questions' },
  { icon: Mic, label: 'Practice Mode', path: '/practice' },
  { icon: Video, label: 'Voice Interview', path: '/voice-interview' },
  { icon: Calendar, label: 'Mock Sessions', path: '/mock-sessions' },
  { icon: BarChart3, label: 'Performance', path: '/performance' },
  { icon: History, label: 'Activity History', path: '/activity' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out',
        'bg-sidebar border-r border-sidebar-border',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center shadow-glow-primary">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-xl font-bold text-gradient animate-fade-in">InterVue</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                'hover:bg-sidebar-accent group',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-glow-primary/20'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )
            }
          >
            <item.icon className={cn('w-5 h-5 flex-shrink-0', 'group-hover:scale-110 transition-transform')} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {!collapsed && user && (
          <div className="px-4 py-2 rounded-xl bg-sidebar-accent/50">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.email}</p>
          </div>
        )}
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;
