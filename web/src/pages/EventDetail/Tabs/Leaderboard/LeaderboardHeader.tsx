import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeaderboardHeader() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-16 text-center">#</TableHead>
        <TableHead>Participant</TableHead>
        <TableHead className="w-24 text-center">Solved</TableHead>
        <TableHead className="w-28 text-center">Score</TableHead>
        <TableHead className="w-28 text-center">Time</TableHead>
      </TableRow>
    </TableHeader>
  )
}