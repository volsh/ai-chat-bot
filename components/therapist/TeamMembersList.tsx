import { useState } from "react";
import { Trash2 } from "lucide-react"; // Assuming you have this icon library
import { TeamMemberWithUsers } from "@/types";
import Badge from "../ui/badge";

const TeamMembersList = ({
  members,
  userId,
  setConfirmRemove,
}: {
  members: TeamMemberWithUsers[];
  userId: string;
  setConfirmRemove: (user: { userId: string; name: string } | null) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<TeamMemberWithUsers | null>(null);

  const openModal = (therapist: TeamMemberWithUsers) => {
    setSelectedTherapist(therapist);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTherapist(null);
  };

  return (
    <div>
      {/* Therapist List */}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.users.id} className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center space-x-4">
              {/* Avatar - Clickable to open modal */}
              <img
                src={m.users.avatar_url || "/path/to/default/avatar.png"}
                alt={m.users.full_name || m.users.email}
                className="h-10 w-10 cursor-pointer rounded-full object-cover"
                onClick={() => openModal(m)} // Open modal on click
              />

              <div>
                <div className="font-medium">{m.users.full_name || m.users.email}</div>
                {/* Short Description */}
                <Badge>{m.role}</Badge>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (m.user_id === userId) {
                    alert("You cannot remove yourself from the team.");
                    return;
                  }
                  setConfirmRemove({
                    userId: m.user_id!,
                    name: m.users.full_name || m.users.email,
                  });
                }}
                className="text-red-500 hover:underline"
                aria-label="Remove team member"
                title="Remove team member"
              >
                <Trash2 size={14} className="mr-1 inline" /> Remove
              </button>
              <div className="text-xs text-zinc-400">
                Joined: {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "—"}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {isModalOpen && selectedTherapist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="relative w-96 rounded-lg bg-white p-6 shadow-lg">
            {/* Close Button */}
            <button className="absolute right-2 top-2 text-lg" onClick={closeModal}>
              &times;
            </button>

            {/* Large Image and Description */}
            <div className="flex flex-col items-center">
              <img
                src={selectedTherapist.users.avatar_url || "/path/to/default/avatar.png"}
                alt={selectedTherapist.users.full_name || selectedTherapist.users.email}
                className="mb-4 h-40 w-40 rounded-full"
              />
              <div className="mb-2 text-xl font-medium">{selectedTherapist.users.full_name}</div>
              <div className="mb-4 text-sm text-zinc-700">
                {selectedTherapist.users.short_description || "No description available"}
              </div>
              <div className="text-sm text-zinc-500">Role: {selectedTherapist.users.role}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembersList;
