import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Package, 
  FileText, 
  ClipboardList, 
  Calculator,
  Settings,
  LogOut,
  Menu,
  Tag,
  TrendingUp,
  Users,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Work Orders", href: "/work-orders", icon: ClipboardList },
  { name: "Invoicing", href: "/invoicing", icon: FileText },
  { name: "Accounting", href: "/accounting", icon: Calculator },
  { name: "Labels", href: "/labels", icon: Tag },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Other docs", href: "/other-docs", icon: FolderOpen },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center h-16 px-4 border-b">
        <h1 className="text-xl font-bold">CNC Manager</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
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
      <div className="px-4 py-4 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start mt-1">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:border-r">
        <NavContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <div className="flex flex-col flex-1 md:pl-0">
          <div className="flex items-center h-16 px-4 border-b md:hidden">
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <h1 className="ml-4 text-lg font-semibold">CNC Manager</h1>
          </div>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <SheetContent side="left" className="w-64 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}