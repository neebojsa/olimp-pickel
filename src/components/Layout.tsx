import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Package, 
  FileText, 
  ShoppingCart,
  ClipboardList, 
  Calculator,
  Settings,
  LogOut,
  Menu,
  TrendingUp,
  Users,
  Truck,
  FolderOpen,
  MapPin,
  Receipt,
  Search,
  User
} from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

const navigation = [
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Work Orders", href: "/work-orders", icon: ClipboardList },
  { name: "Invoicing", href: "/invoicing", icon: FileText },
  { name: "Sales Orders", href: "/sales-orders", icon: ShoppingCart },
  { name: "Purchase Orders", href: "/purchase-orders", icon: FileText },
  { name: "Accounting", href: "/accounting", icon: Calculator },
  { name: "Cost Management", href: "/cost-management", icon: Receipt },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Other docs", href: "/other-docs", icon: FolderOpen },
  { name: "Staff and Location", href: "/staff-and-location", icon: MapPin },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { staff, logout, hasPagePermission, isCustomerUser, customerId } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    const { data } = await supabase.from('company_info').select('*').limit(1).single();
    if (data) {
      setCompanyInfo(data);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter(item => {
    const page = item.href.slice(1); // Remove leading '/'
    return hasPagePermission(page);
  });

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
    const [searchTerm, setSearchTerm] = useState("");

    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col px-4 pt-4 pb-4 space-y-4">
          <div className="w-full relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 space-y-2 mt-auto">
        <div className="flex items-start px-3 py-2 text-sm text-muted-foreground mb-2 gap-2">
          <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            {isCustomerUser() && staff?.customer_name ? (
              <>
                <span>{staff?.name || "Staff"},</span>
                <span className="font-medium">{staff.customer_name}</span>
              </>
            ) : (
              <span>{staff?.name || "Staff"}{staff?.position ? `, ${staff.position}` : ""}</span>
            )}
          </div>
        </div>
        {!isCustomerUser() && (
          <Link
            to="/settings"
            onClick={onLinkClick}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors w-full",
              location.pathname.startsWith("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-screen bg-background">
        {/* Global top bar: hamburger (left, mobile) | logo (center) | notification (right) */}
        <div className="flex items-center justify-between h-16 px-4 border-b shrink-0 w-full gap-4">
          <div className="flex items-center shrink-0 w-10 md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-64 p-0 !h-screen max-h-none [&>button]:hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <NavContent onLinkClick={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
          <Link to="/inventory" className="flex items-center justify-center flex-1 min-w-0 md:justify-start">
            {companyInfo?.logo_url ? (
              <img 
                src={companyInfo.logo_url} 
                alt="Company Logo" 
                className="max-h-10 h-auto object-contain cursor-pointer"
              />
            ) : (
              <h1 className="text-xl font-bold cursor-pointer truncate">{companyInfo?.company_name || "CNC Manager"}</h1>
            )}
          </Link>
          <div className="flex items-center shrink-0">
            <NotificationCenter />
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Desktop Sidebar - no logo, menu only */}
          <div className="hidden md:flex md:w-64 md:min-w-64 md:flex-col flex-shrink-0">
            <NavContent />
          </div>

          {/* Content area */}
          <div className="flex flex-col flex-1 md:pl-0 min-w-0">
            <main className="flex-1 overflow-auto">
                {children}
                <ScrollToTopButton />
              </main>
          </div>
        </div>
      </div>
    </>
  );
}