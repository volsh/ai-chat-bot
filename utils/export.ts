import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Message } from "@/types";

export function exportChatToPDF(sessionTitle: string, messages: Message[]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(sessionTitle, 10, 10);

  const rows = messages.map((m) => [
    m.role.toUpperCase(),
    m.content.length > 80 ? m.content.slice(0, 80) + "..." : m.content,
  ]);

  autoTable(doc, {
    head: [["Role", "Message"]],
    body: rows,
    startY: 20,
  });

  doc.save(`${sessionTitle}.pdf`);
}
