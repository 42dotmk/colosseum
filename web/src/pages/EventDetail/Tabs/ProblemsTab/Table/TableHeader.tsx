import { TableHead, TableHeader , TableRow } from "@/components/ui/table";

export default function TableHeaderComponent() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 text-center">#</TableHead>
        <TableHead>Problem</TableHead>
        <TableHead className="w-24 text-center">Difficulty</TableHead>
        <TableHead className="w-20 text-center">Points</TableHead>
        <TableHead className="w-20 text-center">Status</TableHead>
        <TableHead className="w-12"></TableHead>
      </TableRow>
    </TableHeader>
  )
}