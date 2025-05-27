import { GripVertical } from "lucide-react";

export default function DragHandle({ props }: any) {
  return (
    <span {...props} className="cursor-grab pr-2 text-zinc-400 hover:text-zinc-600">
      <GripVertical size={16} />
    </span>
  );
}
