import { UserProfile } from "@/types";
import { useState } from "react";

type setActionState<T> = React.Dispatch<React.SetStateAction<T>>;

const TherapistCard = ({
  therapist,
  isSelected,
  setSharedWith,
}: {
  therapist: UserProfile;
  isSelected: boolean;
  setSharedWith: setActionState<string[]>;
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const truncatedDescription =
    therapist.short_description && therapist.short_description.length > 100
      ? therapist.short_description.slice(0, 100) + "..."
      : therapist.short_description || "";

  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const toggleSelection = (therapistId: string) => {
    setSharedWith((prev: string[]) => {
      if (prev.includes(therapistId)) {
        return prev.filter((id) => id !== therapistId);
      } else {
        return [...prev, therapistId];
      }
    });
  };

  return (
    <div
      key={therapist.id}
      className={`flex items-center space-x-4 px-2 ${isSelected ? "bg-blue-50" : ""}`}
      onClick={() => toggleSelection(therapist.id)}
    >
      {/* Avatar */}
      <img
        src={therapist.avatar_url || "/path/to/default/avatar.png"}
        alt={therapist.full_name}
        className="h-12 w-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="font-medium">{therapist.full_name}</div>
        <div className="text-sm text-zinc-500">
          {isDescriptionExpanded ? therapist.short_description : truncatedDescription}
        </div>
        {therapist.short_description && therapist.short_description.length > 100 && (
          <button className="text-xs text-blue-500" onClick={toggleDescription}>
            {isDescriptionExpanded ? "Show Less" : "Show More"}
          </button>
        )}
        {isSelected && <span className="ml-2 text-green-600">✓ Selected</span>}
      </div>
    </div>
  );
};

export default TherapistCard;
