import { useSession } from "@/context/SessionContext";
import { supabaseBrowserClient } from "@/libs/supabase";
import { useState } from "react";

export default function FolderCreatorModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📂");
  const [color, setColor] = useState("#3b82f6");
  const session = useSession();

  const createFolder = async () => {
    await supabaseBrowserClient
      .from("folders")
      .insert([{ name, emoji, color, user_id: session?.user.id }]);
    onClose();
  };

  return (
    <div className="modal">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Folder name" />
      <select value={emoji} onChange={(e) => setEmoji(e.target.value)}>
        <option>📂</option>
        <option>🧠</option>
        <option>💼</option>
      </select>
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      <button onClick={createFolder}>Create Folder</button>
    </div>
  );
}
