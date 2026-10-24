"use client";

import React from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Search, 
  FileText, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Plus, 
  Layers,
  CheckCircle2,
  Clock
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { SYNTHETIC_LISTINGS } from "@/lib/data/synthetic-listings";

export default function DashboardPage() {
  const metrics = [
    {
      title: "Active Sourcing Queries",
      value: "3",
      subtext: "Bridge, PVQ & Stainless specs",
      icon: Search,
    },
    {
      title: "Material Lots On Watch",
      value: `${SYNTHETIC_LISTINGS.length}`,
      subtext: "Backed by EN 10204 3.1 MTRs",
      icon: Layers,
    },
    {
      title: "Delivered Quotes Estimated",
      value: "4",
      subtext: "Freight to Midwest & Gulf Coast",
      icon: Truck,
    },
    {
      title: "ASTM Compliance Rate",
      value: "100%",
      subtext: "Deterministic rule validated",
      icon: ShieldCheck,
    },
  ];

  return (
    <PageContainer
      title="Procurement Dashboard"
      description="Monitor active material requirements, delivered cost calculations, and certified batch test reports."
      badge={<Badge variant="outline" size="sm">Buyer Operations</Badge>}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/assistant">
            <Button variant="outline" size="sm">
              Sourcing Assistant
            </Button>
          </Link>
          <Link href="/listings">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Browse Materials
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-medium uppercase tracking-wider">{metric.title}</span>
                    <Icon className="w-4 h-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-slate-900">{metric.value}</div>
                  <p className="text-[11px] text-slate-500 mt-1">{metric.subtext}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Inventory Benchmarks Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Recent Verified Material Lots</CardTitle>
                  <Badge variant="demo" size="sm">Demo Data</Badge>
                </div>
                <CardDescription>
                  Pre-screened physical inventory backed by ladle chemistry and mechanical test results.
                </CardDescription>
              </div>
              <Link href="/listings">
                <Button variant="outline" size="sm">
                  View All Marketplace
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Heat Number</TableHead>
                  <TableHead>Grade &amp; Form</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Warehouse Origin</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {SYNTHETIC_LISTINGS.slice(0, 4).map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono font-semibold text-slate-900">
                      {lot.certificate?.heat_number}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-slate-900 block">{lot.grade?.grade_name}</span>
                      <span className="text-[11px] text-slate-500">{lot.product_form}</span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      {lot.dimensions_display}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {(lot.total_weight_lbs / 2000).toFixed(1)} tons
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-slate-900">
                      ${lot.price_per_cwt.toFixed(2)}/cwt
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {lot.warehouse_city}, {lot.warehouse_state}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Pass</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/listings/${lot.id}`}>
                        <Button variant="outline" size="sm">
                          Inspect
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Workflow Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Requirement Matching</CardTitle>
              <CardDescription>
                Translate application criteria into standard steel grades.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-slate-600 leading-relaxed">
                Need to determine suitable material for high-restraint welding, low-temperature service (-20°F), or marine exposure? Use our Sourcing Assistant to map parameters into ASTM specifications.
              </p>
              <Link href="/assistant">
                <Button variant="primary" size="sm">
                  Launch Assistant
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Supplier Document Ingestion</CardTitle>
              <CardDescription>
                Upload and evaluate Mill Test Certificates before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-slate-600 leading-relaxed">
                Service centers and distributors can ingest EN 10204 3.1 certificates. Numerical values are extracted and verified against ASTM limits before publishing.
              </p>
              <Link href="/sell">
                <Button variant="outline" size="sm">
                  Go to Supplier Portal
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
