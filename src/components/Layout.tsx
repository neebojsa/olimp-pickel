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
  Truck,
  FolderOpen,
  MapPin,
  Receipt,
  Scan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ocrService, OCRResult } from "@/lib/ocrService";

const navigation = [
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Work Orders", href: "/work-orders", icon: ClipboardList },
  { name: "Invoicing", href: "/invoicing", icon: FileText },
  { name: "Accounting", href: "/accounting", icon: Calculator },
  { name: "Cost Management", href: "/cost-management", icon: Receipt },
  { name: "Labels", href: "/labels", icon: Tag },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Other docs", href: "/other-docs", icon: FolderOpen },
  { name: "Staff and Location", href: "/staff-and-location", icon: MapPin },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const { staff, logout, hasPagePermission } = useAuth();
  const { toast } = useToast();
  const [isTestOCROpen, setIsTestOCROpen] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleTestOCR = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is PDF or image
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name);

    if (!isPDF && !isImage) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF or image file.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setIsTestOCROpen(true);
    setOcrResult(null);

    try {
      let result: OCRResult;
      if (isPDF) {
        result = await ocrService.processPDF(file);
      } else {
        result = await ocrService.processImage(file);
      }
      setOcrResult(result);
    } catch (error: any) {
      console.error('OCR processing error:', error);
      toast({
        title: "OCR Processing Error",
        description: error?.message || "Failed to process the file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter(item => {
    const page = item.href.slice(1); // Remove leading '/'
    return hasPagePermission(page);
  });

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center h-20 px-4 border-b space-y-2">
        {companyInfo?.logo_url ? (
          <img 
            src={companyInfo.logo_url} 
            alt="Company Logo" 
            className="max-w-full max-h-12 h-auto object-contain"
          />
        ) : (
          <h1 className="text-xl font-bold">{companyInfo?.company_name || "CNC Manager"}</h1>
        )}
        <p className="text-xs text-muted-foreground">
          {staff?.name || "Staff"}{staff?.position ? `, ${staff.position}` : ""}
        </p>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {filteredNavigation.map((item) => {
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
      <div className="px-4 py-4 border-t space-y-2 mt-auto">
        <Link
          to="/settings"
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
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
          onClick={() => {
            console.log('Test OCR button clicked');
            handleTestOCR();
          }}
        >
          <Scan className="w-4 h-4 mr-2" />
          Test OCR
        </Button>
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

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,application/pdf,image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Dialog open={isTestOCROpen} onOpenChange={setIsTestOCROpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>OCR Test Results</DialogTitle>
            <DialogDescription>
              Results from OCR processing of the selected file
            </DialogDescription>
          </DialogHeader>
          {isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Processing file with OCR...</p>
              </div>
            </div>
          ) : ocrResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Engine:</span> {ocrResult.engine}
                </div>
                <div>
                  <span className="font-semibold">Confidence:</span> {(ocrResult.confidence * 100).toFixed(1)}%
                </div>
                <div>
                  <span className="font-semibold">Processing Time:</span> {ocrResult.processingTime}ms
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Extracted Text:</h3>
                <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{ocrResult.text || 'No text extracted'}</pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Structured Data:</h3>
                <div className="bg-muted p-4 rounded-md space-y-2">
                  {ocrResult.extractedData.supplier_name && (
                    <div><span className="font-semibold">Supplier:</span> {ocrResult.extractedData.supplier_name}</div>
                  )}
                  {ocrResult.extractedData.document_number && (
                    <div><span className="font-semibold">Document Number:</span> {ocrResult.extractedData.document_number}</div>
                  )}
                  {ocrResult.extractedData.issue_date && (
                    <div><span className="font-semibold">Issue Date:</span> {ocrResult.extractedData.issue_date}</div>
                  )}
                  {ocrResult.extractedData.due_date && (
                    <div><span className="font-semibold">Due Date:</span> {ocrResult.extractedData.due_date}</div>
                  )}
                  {ocrResult.extractedData.total_amount !== undefined && (
                    <div>
                      <span className="font-semibold">Total Amount:</span> {ocrResult.extractedData.total_amount} {ocrResult.extractedData.currency || 'BAM'}
                    </div>
                  )}
                  {ocrResult.extractedData.subtotal_tax_excluded !== undefined && (
                    <div>
                      <span className="font-semibold">Subtotal (tax excluded):</span> {ocrResult.extractedData.subtotal_tax_excluded} {ocrResult.extractedData.currency || 'BAM'}
                    </div>
                  )}
                  {ocrResult.extractedData.document_type && (
                    <div><span className="font-semibold">Document Type:</span> {ocrResult.extractedData.document_type}</div>
                  )}
                  {Object.keys(ocrResult.extractedData).length === 0 && (
                    <div className="text-muted-foreground">No structured data extracted</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Raw JSON:</h3>
                <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(ocrResult, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No results to display
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 md:min-w-64 md:flex-col md:border-r flex-shrink-0">
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
              <div className="ml-4 flex items-center space-x-2">
                {companyInfo?.logo_url ? (
                  <img 
                    src={companyInfo.logo_url} 
                    alt="Company Logo" 
                    className="max-h-8 h-auto object-contain"
                  />
                ) : null}
                <h1 className="text-lg font-semibold">{companyInfo?.company_name || "CNC Manager"}</h1>
              </div>
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
    </>
  );
}