"use client";

import { useState } from "react";
import MultiSelectChips from "../ui/multiSelectChips";
import { UserProfile } from "@/types";
import TherapistCard from "./TherapistsCard";

type SetActionState<T> = React.Dispatch<React.SetStateAction<T>>;

interface Props {
  sharedWith: string[];
  setSharedWith: SetActionState<string[]>;
  label: string;
  therapists: UserProfile[];
  loadingTherapists?: boolean;
}

const TherapistList = ({
  sharedWith,
  setSharedWith,
  label,
  therapists,
  loadingTherapists = false,
}: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">{label}</label>
        <MultiSelectChips
          options={therapists.map((t) => ({ value: t.id, label: t.full_name || t.email }))}
          values={sharedWith}
          onChange={setSharedWith}
          isLoading={loadingTherapists}
          searchable
          scrollable
        />
      </div>

      <div className="mt-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
        >
          View Therapists
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative max-h-[80vh] w-[80vw] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <button
              className="absolute right-2 top-2 text-lg"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>

            <div>
              <h2 className="mb-4 text-xl font-semibold">Select Therapists</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {therapists.map((therapist) => {
                  const isSelected = sharedWith.includes(therapist.id);
                  return (
                    <TherapistCard
                      key={therapist.id}
                      therapist={therapist}
                      isSelected={isSelected}
                      setSharedWith={setSharedWith}
                    />
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full rounded bg-gray-600 py-2 text-white hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistList;
