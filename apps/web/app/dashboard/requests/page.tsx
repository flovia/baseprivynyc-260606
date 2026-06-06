import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchDashboard, textValue } from "@/lib/flovia";

export default async function RequestsPage() {
  const { data, error } = await fetchDashboard();
  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-7xl">
        <CardHeader>
          <CardTitle>Dashboard requests</CardTitle>
          <CardDescription>{error ?? "Recent request data fetched from the dashboard API."}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Wallet</TableHead><TableHead>Segment</TableHead><TableHead>Endpoint</TableHead><TableHead>Policy</TableHead><TableHead>Tx</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.recent_requests ?? []).map((row, index) => (
                <TableRow key={`${textValue(row.wallet)}-${index}`}>
                  <TableCell>{textValue(row.time)}</TableCell>
                  <TableCell>{textValue(row.wallet)}</TableCell>
                  <TableCell>{textValue(row.segment)}</TableCell>
                  <TableCell>{textValue(row.endpoint)}</TableCell>
                  <TableCell>{textValue(row.policy)}</TableCell>
                  <TableCell>{textValue(row.tx_hash)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
