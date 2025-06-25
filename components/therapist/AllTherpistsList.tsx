"use client";

import { useState, useEffect } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { toast } from "react-hot-toast";
import MultiSelectChips from "../ui/multiSelectChips"; // Assuming MultiSelectChips is a component that allows multiple selections
import { UserProfile } from "@/types";
import TherapistCard from "./TherapistsCard";

type setActionState<T> = React.Dispatch<React.SetStateAction<T>>;

const TherapistList = ({
  sharedWith,
  setSharedWith,
  label,
}: {
  sharedWith: string[];
  setSharedWith: setActionState<string[]>;
  label: string;
}) => {
  const [availableTherapists, setAvailableTherapists] = useState<UserProfile[]>([]);
  const [loadingTherapists, setLoadingTherapists] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Fetch available therapists
    const loadTherapists = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role, avatar_url, short_description, created_at")
        .eq("role", "therapist");

      if (error) {
        toast.error("Failed to load therapists");
        setLoadingTherapists(false);
        return;
      }

      setAvailableTherapists(data || []);
      setLoadingTherapists(false);
    };
    loadTherapists();
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* MultiSelect for Sharing with Therapists */}
      <div>
        <label className="text-sm font-medium">{label}</label>
        <MultiSelectChips
          options={availableTherapists.map((t) => ({
            value: t.id,
            label: t.full_name || t.email,
          }))}
          values={sharedWith}
          onChange={setSharedWith}
          isLoading={loadingTherapists}
          searchable
          scrollable
        />
      </div>

      {/* Button to open the therapists list modal */}
      <div className="mt-4">
        <button
          onClick={openModal}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
        >
          View Therapists
        </button>
      </div>

      {/* Modal for Therapist List */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative max-h-[80vh] w-[80vw] overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <button className="absolute right-2 top-2 text-lg" onClick={closeModal}>
              &times;
            </button>

            <div>
              <h2 className="mb-4 text-xl font-semibold">Select Therapists</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableTherapists.map((therapist) => {
                  const isSelected = sharedWith.includes(therapist.id);
                  return (
                    <TherapistCard
                      therapist={therapist}
                      isSelected={isSelected}
                      setSharedWith={setSharedWith}
                    />
                  );
                })}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={closeModal}
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
