import { Link } from "react-router-dom";
import { Package, ClipboardList, FileText, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">CNC Manager</h1>
          <p className="text-xl text-muted-foreground">
            Complete management solution for your CNC machining business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link to="/inventory">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Package className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Inventory Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track materials, tools, and stock levels
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/work-orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <ClipboardList className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Work Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Plan and track machining projects
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/invoicing">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <FileText className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Invoicing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generate and manage customer invoices
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/accounting">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Calculator className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Accounting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track expenses and financial reports
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center">
          <Link to="/inventory">
            <Button size="lg">
              Get Started with Inventory
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
