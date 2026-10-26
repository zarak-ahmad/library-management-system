import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reportApi, ReportType, REPORT_LABELS } from '@/api/report.api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const reportTypes = Object.keys(REPORT_LABELS) as ReportType[];

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const availableTypes = reportTypes.filter(
    (t) => t !== 'librarian-activity' || user?.role === 'admin'
  );

  const params = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    department: department || undefined,
    status: status || undefined,
    limit: 200,
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports', reportType, params],
    queryFn: () => reportApi.generate(reportType, params),
  });

  const report = data?.data;

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(format);
      await reportApi.exportFile(reportType, format, params);
      toast({ title: 'Export started', description: `${REPORT_LABELS[reportType]} report downloaded.` });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  return (
    <DashboardLayout title="Reports">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>{REPORT_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department (optional)</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status Filter (optional)</Label>
            <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. pending, active" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Loading...' : 'Preview Report'}
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={!!exporting}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')} disabled={!!exporting}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{report?.title || 'Report Preview'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Loading report...</p>
          ) : !report || report.rows.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No data for selected filters</p>
          ) : (
            <>
              {report.summary && (
                <div className="p-4 flex flex-wrap gap-4 border-b text-sm">
                  {Object.entries(report.summary).map(([key, value]) => (
                    <span key={key}>
                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                      <strong>{value}</strong>
                    </span>
                  ))}
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="list-header">
                    {report.headers.map((h) => (
                      <th key={h} className="text-left p-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr key={i} className="list-row-hover">
                      {row.map((cell, j) => (
                        <td key={j} className="p-3 whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
