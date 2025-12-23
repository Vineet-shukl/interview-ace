import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import NotificationCenter from '@/components/NotificationCenter';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background bg-holographic">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      {/* Top notification bar */}
      <div
        className={cn(
          'fixed top-4 right-6 z-40 transition-all duration-300',
          sidebarCollapsed ? 'left-24' : 'left-68'
        )}
      >
        <div className="flex justify-end">
          <NotificationCenter />
        </div>
      </div>
      
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <div className="p-6 lg:p-8 pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
