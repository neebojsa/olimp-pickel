import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";

// Mock work orders data
const mockWorkOrders = [
  {
    id: "WO-001",
    workOrderNumber: "WO-2024-001",
    partName: "Aluminum Bracket Assembly",
    partNumber: "AL-001",
    buyer: "ABC Manufacturing",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 75,
  },
  {
    id: "WO-002", 
    workOrderNumber: "WO-2024-002",
    partName: "Steel Mounting Plate",
    partNumber: "ST-002",
    buyer: "XYZ Industries",
    status: "Completed",
    priority: "Medium",
    percentageCompletion: 100,
  },
  {
    id: "WO-003",
    workOrderNumber: "WO-2024-003", 
    partName: "Precision Shaft",
    partNumber: "PR-003",
    buyer: "TechCorp Solutions",
    status: "Not Started",
    priority: "Low",
    percentageCompletion: 0,
  },
  {
    id: "WO-004",
    workOrderNumber: "WO-2024-004",
    partName: "Custom Gear Housing", 
    partNumber: "GH-004",
    buyer: "MechSystems Ltd",
    status: "In Progress",
    priority: "High",
    percentageCompletion: 45,
  },
  {
    id: "WO-005",
    workOrderNumber: "WO-2024-005",
    partName: "Bearing Support Block",
    partNumber: "BS-005", 
    buyer: "Industrial Partners",
    status: "On Hold",
    priority: "Medium",
    percentageCompletion: 20,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "In Progress":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "On Hold":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "Not Started":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-500/10 text-red-700 border-red-200";
    case "Medium":
      return "bg-orange-500/10 text-orange-700 border-orange-200";
    case "Low":
      return "bg-green-500/10 text-green-700 border-green-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

export default function WorkOrders() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Work Orders</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order Number</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockWorkOrders.map((workOrder) => (
                  <TableRow key={workOrder.id}>
                    <TableCell className="font-medium">
                      {workOrder.workOrderNumber}
                    </TableCell>
                    <TableCell>
                      <Link 
                        to="/inventory" 
                        className="text-primary hover:underline font-medium"
                      >
                        {workOrder.partName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {workOrder.partNumber}
                    </TableCell>
                    <TableCell>{workOrder.buyer}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(workOrder.status)}
                      >
                        {workOrder.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getPriorityColor(workOrder.priority)}
                      >
                        {workOrder.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={workOrder.percentageCompletion} 
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground min-w-[3rem]">
                          {workOrder.percentageCompletion}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}